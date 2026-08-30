import {
  User,
  AuthToken,
  RefreshSession,
  Organization,
  Membership,
  Role,
} from "../../models/index.js";
import { PasswordUtil } from "../../utils/password/PasswordUtil.js";
import { JwtUtil } from "../../utils/jwt/JwtUtil.js";
import { EmailUtil } from "../../utils/email/EmailUtil.js";

export class AuthController {
  static requiresEmailVerification() {
    return process.env.REQUIRE_EMAIL_VERIFICATION === "true";
  }

  /**
   * Register a new user
   * POST /auth/register
   */
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, confirmPassword } = req.body;
      const requiresEmailVerification = AuthController.requiresEmailVerification();

      // Validation
      if (
        typeof firstName !== "string" ||
        typeof lastName !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !firstName.trim() ||
        !lastName.trim() ||
        !email.trim() ||
        !password
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }

      // Password validation
      const passwordCheck = PasswordUtil.validate(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.error });
      }

      // Check if user exists
      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await PasswordUtil.hash(password);

      // Create user
      const user = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        emailVerified: !requiresEmailVerification,
        status: requiresEmailVerification ? "pending" : "active",
      });

      await user.save();

      if (requiresEmailVerification) {
        // Generate email verification token
        const verificationToken = JwtUtil.generateEmailVerificationToken(user._id);
        const verificationLink = `${process.env.APP_URL || "http://localhost:5173"}/verify-email?token=${verificationToken}`;

        // Save verification token
        await AuthToken.create({
          user: user._id,
          token: verificationToken,
          type: "email_verification",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        // Send verification email
        try {
          await EmailUtil.sendVerificationEmail(user.email, verificationLink);
        } catch (emailError) {
          console.error("Email send failed:", emailError);
        }
      }

      res.status(201).json({
        message: requiresEmailVerification
          ? "User registered successfully. Please verify your email."
          : "Account created successfully. You can now log in.",
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Registration failed", details: error.message });
    }
  }

  /**
   * Verify email
   * POST /auth/verify-email
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const decoded = JwtUtil.verifyEmailToken(token);
      if (!decoded) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      const storedToken = await AuthToken.findOne({
        token,
        type: "email_verification",
        user: decoded.userId,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });
      if (!storedToken) return res.status(400).json({ error: "Verification token has expired or already been used" });

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Mark email as verified
      user.emailVerified = true;
      user.status = "active";
      await user.save();

      // Mark token as used
      storedToken.isUsed = true;
      storedToken.usedAt = new Date();
      await storedToken.save();

      res.json({
        message: "Email verified successfully",
        user: {
          id: user._id,
          email: user.email,
          status: user.status,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Email verification failed", details: error.message });
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash +loginAttempts +lockUntil");

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        return res.status(423).json({
          error: "Account temporarily locked. Try again later.",
          lockUntilTime: user.lockUntil,
        });
      }

      // Verify password
      const isPasswordValid = await PasswordUtil.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        }
        await user.save();
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({
          error: "Email not verified. Please check your inbox.",
          userId: user._id,
        });
      }

      // Check if user status is active
      if (user.status !== "active") {
        return res.status(403).json({ error: "User account is not active" });
      }

      // Reset login attempts
      user.loginAttempts = 0;
      user.lockUntil = null;
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const accessToken = JwtUtil.generateAccessToken({ userId: user._id });
      const refreshToken = JwtUtil.generateRefreshToken({ userId: user._id });

      // Save refresh session
      await RefreshSession.create({
        user: user._id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      // Get user organizations
      const memberships = await Membership.find({ user: user._id, status: "active" }).populate("organization");
      const organizations = memberships
        .filter((membership) => membership.organization)
        .map((membership) => ({
          id: membership.organization._id,
          name: membership.organization.name,
        }));

      res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizations,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Login failed", details: error.message });
    }
  }

  /**
   * Refresh access token
   * POST /auth/refresh-token
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }

      const decoded = JwtUtil.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      const session = await RefreshSession.findOne({
        user: decoded.userId,
        token: refreshToken,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        return res.status(401).json({ error: "Refresh token not found or revoked" });
      }

      const user = await User.findById(decoded.userId).select("status");
      if (!user || user.status !== "active") {
        return res.status(403).json({ error: "User account is not active" });
      }

      const newAccessToken = JwtUtil.generateAccessToken({ userId: decoded.userId });

      res.json({
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
      });
    } catch (error) {
      res.status(500).json({ error: "Token refresh failed", details: error.message });
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  static async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await RefreshSession.updateOne(
          { token: refreshToken },
          { isRevoked: true, revokedAt: new Date(), revokedReason: "User logout" }
        );
      }

      res.json({ message: "Logout successful" });
    } catch (error) {
      res.status(500).json({ error: "Logout failed", details: error.message });
    }
  }

  /**
   * Request password reset
   * POST /auth/forgot-password
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await User.findOne({ email: email.trim().toLowerCase() });
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: "If email exists, password reset link has been sent" });
      }

      const resetToken = JwtUtil.generatePasswordResetToken(user._id);
      const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

      await AuthToken.updateMany(
        { user: user._id, type: "password_reset", isUsed: false },
        { isUsed: true, usedAt: new Date() }
      );

      // Save reset token
      await AuthToken.create({
        user: user._id,
        token: resetToken,
        type: "password_reset",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      // Send reset email
      try {
        await EmailUtil.sendPasswordResetEmail(user.email, resetLink);
      } catch (emailError) {
        console.error("Email send failed:", emailError);
      }

      res.json({ message: "If email exists, password reset link has been sent" });
    } catch (error) {
      res.status(500).json({ error: "Password reset request failed", details: error.message });
    }
  }

  /**
   * Reset password
   * POST /auth/reset-password
   */
  static async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "Token and passwords are required" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }

      const passwordCheck = PasswordUtil.validate(newPassword);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.error });
      }

      const decoded = JwtUtil.verifyPasswordResetToken(token);
      if (!decoded) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const storedToken = await AuthToken.findOne({
        token,
        type: "password_reset",
        user: decoded.userId,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });
      if (!storedToken) return res.status(400).json({ error: "Reset token has expired or already been used" });

      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordHash = await PasswordUtil.hash(newPassword);
      user.passwordHash = passwordHash;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();

      // Mark token as used
      storedToken.isUsed = true;
      storedToken.usedAt = new Date();
      await storedToken.save();
      await RefreshSession.updateMany(
        { user: user._id, isRevoked: false },
        { isRevoked: true, revokedAt: new Date(), revokedReason: "Password reset" }
      );

      res.json({ message: "Password reset successfully. Please login with your new password." });
    } catch (error) {
      res.status(500).json({ error: "Password reset failed", details: error.message });
    }
  }

  /**
   * Get current user profile
   * GET /auth/me
   */
  static async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user.id).select("-passwordHash");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user organizations
      const memberships = await Membership.find({ user: user._id, status: "active" }).populate("organization role");

      const organizations = memberships
        .filter((membership) => membership.organization)
        .map((membership) => ({
          id: membership.organization._id,
          name: membership.organization.name,
          role: membership.role?.name || null,
        }));

      res.json({
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          organizations,
          preferences: user.preferences,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user profile", details: error.message });
    }
  }

  /**
   * Update user profile
   * PUT /auth/profile
   */
  static async updateProfile(req, res) {
    try {
      const { firstName, lastName, phone, preferences } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (typeof firstName === "string" && firstName.trim()) user.firstName = firstName.trim();
      if (typeof lastName === "string" && lastName.trim()) user.lastName = lastName.trim();
      if (typeof phone === "string") user.phone = phone.trim();
      if (preferences) user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          preferences: user.preferences,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Profile update failed", details: error.message });
    }
  }

  /**
   * Change password
   * POST /auth/change-password
   */
  static async changePassword(req, res) {
    try {
      const { oldPassword, newPassword, confirmPassword } = req.body;

      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "All password fields are required" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }

      const passwordCheck = PasswordUtil.validate(newPassword);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.error });
      }

      const user = await User.findById(req.user.id).select("+passwordHash");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isPasswordValid = await PasswordUtil.compare(oldPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      user.passwordHash = await PasswordUtil.hash(newPassword);
      await user.save();

      await RefreshSession.updateMany(
        { user: user._id, isRevoked: false },
        { isRevoked: true, revokedAt: new Date(), revokedReason: "Password changed" }
      );

      res.json({ message: "Password changed successfully. Please sign in again." });
    } catch (error) {
      res.status(500).json({ error: "Password change failed", details: error.message });
    }
  }
}
