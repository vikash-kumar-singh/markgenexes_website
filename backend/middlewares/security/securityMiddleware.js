import crypto from "node:crypto";
import { isProduction } from "../../config/environment.js";

const rateBuckets = new Map();

function cleanRequestId(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9._-]{8,100}$/.test(id) ? id : crypto.randomUUID();
}

export function requestContext(req, res, next) {
  req.id = cleanRequestId(req.get("x-request-id"));
  res.setHeader("X-Request-Id", req.id);
  next();
}

export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (isProduction && req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

export function sanitizeErrorResponses(req, res, next) {
  if (!isProduction) return next();
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === "object" && "details" in body) {
      const { details, ...safeBody } = body;
      return sendJson(safeBody);
    }
    return sendJson(body);
  };
  next();
}

export function createRateLimiter({ windowMs, max, keyPrefix, keyGenerator }) {
  return (req, res, next) => {
    const now = Date.now();
    const identity = keyGenerator?.(req) || req.ip || "unknown";
    const key = `${keyPrefix}:${identity}`;
    let bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    rateBuckets.set(key, bucket);

    if (rateBuckets.size > 20000) {
      for (const [bucketKey, value] of rateBuckets) if (value.resetAt <= now) rateBuckets.delete(bucketKey);
    }

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - bucket.count));
    res.setHeader("RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ error: "Too many requests. Please try again later.", requestId: req.id });
    }
    return next();
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "API endpoint not found", requestId: req.id });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const isInvalidJson = error instanceof SyntaxError && error.status === 400 && "body" in error;
  const status = error.status || error.statusCode || (isInvalidJson ? 400 : 500);
  const message = isInvalidJson ? "Request body contains invalid JSON" : status >= 500 ? "Internal server error" : error.message || "Request failed";
  if (status >= 500) console.error(`[${req.id}]`, error);
  return res.status(status).json({ error: message, requestId: req.id });
}
