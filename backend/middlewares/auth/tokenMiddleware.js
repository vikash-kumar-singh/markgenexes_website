import { JwtUtil } from "../../utils/jwt/JwtUtil.js";
import { User } from "../../models/index.js";

function bearerToken(req) {
  const [scheme, token] = String(req.get("authorization") || "").trim().split(/\s+/);
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

async function loadAuthenticatedUser(req, res, next, missingMessage) {
  try {
    if (req.user?.id) return next();
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: missingMessage });

    const decoded = JwtUtil.verifyAccessToken(token);
    if (!decoded?.userId) return res.status(401).json({ error: "Invalid or expired access token" });

    const user = await User.findById(decoded.userId).select("email role status");
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.status !== "active") return res.status(403).json({ error: "User account is not active" });

    req.user = { id: user._id, email: user.email, role: user.role };
    req.token = token;
    return next();
  } catch (error) {
    return next(error);
  }
}

export const verifyAccessToken = (req, res, next) =>
  loadAuthenticatedUser(req, res, next, "Access token is required");

export const isAuthenticated = (req, res, next) =>
  loadAuthenticatedUser(req, res, next, "Authentication required");

export const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) return res.status(401).json({ error: "Refresh token is required" });

    const decoded = JwtUtil.verifyRefreshToken(refreshToken);
    if (!decoded?.userId) return res.status(401).json({ error: "Invalid or expired refresh token" });

    const user = await User.findById(decoded.userId).select("email role status");
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.status !== "active") return res.status(403).json({ error: "User account is not active" });

    req.user = { id: user._id, email: user.email, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireAdminAccess = (req, res, next) => {
  const allowedRoles = new Set(
    (process.env.ADMIN_ALLOWED_ROLES || "admin,manager")
      .split(",")
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean)
  );
  if (!req.user || !allowedRoles.has(String(req.user.role).toLowerCase())) {
    return res.status(403).json({ error: "Administrator access required" });
  }
  return next();
};
