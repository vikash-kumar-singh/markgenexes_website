import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(configDirectory, "..");

dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });

export const isProduction = process.env.NODE_ENV === "production";

function isWeakSecret(value) {
  return !value || value.length < 32 || /^(your-|change-me|replace|secret)/i.test(value);
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function validateEnvironment() {
  const errors = [];
  if (!process.env.MONGO_URI) errors.push("MONGO_URI is required");
  if (!process.env.JWT_SECRET) errors.push("JWT_SECRET is required");
  if (!process.env.JWT_REFRESH_SECRET) errors.push("JWT_REFRESH_SECRET is required");
  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    errors.push("JWT_SECRET and JWT_REFRESH_SECRET must be different");
  }
  if (isProduction && isWeakSecret(process.env.JWT_SECRET)) {
    errors.push("JWT_SECRET must be a non-placeholder secret of at least 32 characters in production");
  }
  if (isProduction && isWeakSecret(process.env.JWT_REFRESH_SECRET)) {
    errors.push("JWT_REFRESH_SECRET must be a non-placeholder secret of at least 32 characters in production");
  }
  if (isProduction && !isHttpUrl(process.env.APP_URL)) {
    errors.push("APP_URL must be an absolute http(s) URL in production");
  }
  if (isProduction) {
    const origins = String(process.env.CORS_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (!origins.length || origins.includes("*") || origins.some((origin) => !isHttpUrl(origin))) {
      errors.push("CORS_ORIGIN must contain explicit comma-separated http(s) origins in production");
    }
  }

  const port = Number(process.env.PORT || 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push("PORT must be a valid TCP port");
  if (errors.length) throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`);
  return { port };
}
