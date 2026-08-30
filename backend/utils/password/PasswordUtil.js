import bcrypt from "bcryptjs";

export class PasswordUtil {
  static async hash(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async compare(password, hash) {
    return bcrypt.compare(password, hash);
  }

  static validate(password) {
    const minLength = 8;
    if (typeof password !== "string") {
      return { valid: false, error: "Password must be a string" };
    }
    if (Buffer.byteLength(password, "utf8") > 72) {
      return { valid: false, error: "Password must not exceed 72 UTF-8 bytes" };
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (password.length < minLength) {
      return { valid: false, error: `Password must be at least ${minLength} characters long` };
    }
    if (!hasUpperCase) {
      return { valid: false, error: "Password must contain at least one uppercase letter" };
    }
    if (!hasLowerCase) {
      return { valid: false, error: "Password must contain at least one lowercase letter" };
    }
    if (!hasNumbers) {
      return { valid: false, error: "Password must contain at least one number" };
    }
    if (!hasSpecialChar) {
      return { valid: false, error: "Password must contain at least one special character" };
    }

    return { valid: true };
  }
}
