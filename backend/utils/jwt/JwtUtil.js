import jwt from "jsonwebtoken";

function getSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sign(payload, secretName, expiresIn) {
  return jwt.sign(payload, getSecret(secretName), { algorithm: "HS256", expiresIn });
}

function verify(token, secretName, expectedType) {
  try {
    const decoded = jwt.verify(token, getSecret(secretName), { algorithms: ["HS256"] });
    if (expectedType && decoded.type !== expectedType) return null;
    return decoded;
  } catch {
    return null;
  }
}

export class JwtUtil {
  static generateAccessToken(payload, expiresIn = "15m") {
    return sign({ ...payload, type: "access" }, "JWT_SECRET", expiresIn);
  }

  static generateRefreshToken(payload, expiresIn = "7d") {
    return sign({ ...payload, type: "refresh" }, "JWT_REFRESH_SECRET", expiresIn);
  }

  static verifyAccessToken(token) {
    return verify(token, "JWT_SECRET", "access");
  }

  static verifyRefreshToken(token) {
    return verify(token, "JWT_REFRESH_SECRET", "refresh");
  }

  static generateEmailVerificationToken(userId) {
    return sign({ userId, type: "email_verification" }, "JWT_SECRET", "24h");
  }

  static generatePasswordResetToken(userId) {
    return sign({ userId, type: "password_reset" }, "JWT_SECRET", "1h");
  }

  static generateInvitationToken({ email, organizationId }) {
    return sign({ email, organizationId, type: "invitation" }, "JWT_SECRET", "7d");
  }

  static verifyEmailToken(token) {
    return verify(token, "JWT_SECRET", "email_verification");
  }

  static verifyPasswordResetToken(token) {
    return verify(token, "JWT_SECRET", "password_reset");
  }

  static verifyInvitationToken(token) {
    return verify(token, "JWT_SECRET", "invitation");
  }

  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }
}
