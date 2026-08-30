import express from "express";
import { AuthController } from "../../controllers/auth/AuthController.js";
import { isAuthenticated } from "../../middlewares/auth/tokenMiddleware.js";
import { createRateLimiter } from "../../middlewares/security/securityMiddleware.js";

const router = express.Router();
const emailKey = (req) => `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`;
const registerLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: "auth-register" });
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "auth-login", keyGenerator: emailKey });
const recoveryLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: "auth-recovery", keyGenerator: emailKey });
const refreshLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, keyPrefix: "auth-refresh" });

// Public routes
router.post("/register", registerLimiter, AuthController.register);
router.post("/verify-email", recoveryLimiter, AuthController.verifyEmail);
router.post("/login", loginLimiter, AuthController.login);
router.post("/refresh-token", refreshLimiter, AuthController.refreshToken);
router.post("/forgot-password", recoveryLimiter, AuthController.forgotPassword);
router.post("/reset-password", recoveryLimiter, AuthController.resetPassword);

// Protected routes
router.get("/me", isAuthenticated, AuthController.getCurrentUser);
router.put("/profile", isAuthenticated, AuthController.updateProfile);
router.post("/change-password", isAuthenticated, AuthController.changePassword);
router.post("/logout", AuthController.logout);

export default router;
