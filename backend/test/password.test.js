import assert from "node:assert/strict";
import test from "node:test";
import { PasswordUtil } from "../utils/password/PasswordUtil.js";

test("password validation rejects non-strings and bcrypt-truncated values", () => {
  assert.equal(PasswordUtil.validate({}).valid, false);
  assert.equal(PasswordUtil.validate(`Aa1!${"x".repeat(69)}`).valid, false);
});

test("password validation accepts a strong password within bcrypt limits", () => {
  assert.deepEqual(PasswordUtil.validate("Enterprise!2026"), { valid: true });
});
