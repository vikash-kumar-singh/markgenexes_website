import assert from "node:assert/strict";
import test from "node:test";

process.env.JWT_SECRET = "test-access-secret-that-is-longer-than-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-different-and-long-enough";

const { JwtUtil } = await import("../utils/jwt/JwtUtil.js");

test("access and refresh tokens use separate signing secrets", () => {
  const accessToken = JwtUtil.generateAccessToken({ userId: "user-1" });
  const refreshToken = JwtUtil.generateRefreshToken({ userId: "user-1" });
  assert.equal(JwtUtil.verifyAccessToken(accessToken).userId, "user-1");
  assert.equal(JwtUtil.verifyRefreshToken(refreshToken).userId, "user-1");
  assert.equal(JwtUtil.verifyAccessToken(refreshToken), null);
  assert.equal(JwtUtil.verifyRefreshToken(accessToken), null);
});

test("purpose-bound tokens cannot be used for another flow", () => {
  const verificationToken = JwtUtil.generateEmailVerificationToken("user-1");
  const resetToken = JwtUtil.generatePasswordResetToken("user-1");
  assert.equal(JwtUtil.verifyEmailToken(verificationToken).userId, "user-1");
  assert.equal(JwtUtil.verifyPasswordResetToken(resetToken).userId, "user-1");
  assert.equal(JwtUtil.verifyPasswordResetToken(verificationToken), null);
  assert.equal(JwtUtil.verifyEmailToken(resetToken), null);
  assert.equal(JwtUtil.verifyAccessToken(verificationToken), null);
  assert.equal(JwtUtil.verifyAccessToken(resetToken), null);
});

test("invitations are bound to an email and organization", () => {
  const token = JwtUtil.generateInvitationToken({
    email: "invitee@example.com",
    organizationId: "organization-1",
  });
  const decoded = JwtUtil.verifyInvitationToken(token);
  assert.equal(decoded.email, "invitee@example.com");
  assert.equal(decoded.organizationId, "organization-1");
  assert.equal(JwtUtil.verifyEmailToken(token), null);
});
