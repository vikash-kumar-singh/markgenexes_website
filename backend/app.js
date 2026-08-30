import "./config/environment.js";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import { backendRoot } from "./config/environment.js";
import { errorHandler, notFoundHandler, requestContext, sanitizeErrorResponses, securityHeaders } from "./middlewares/security/securityMiddleware.js";

const app = express();
app.disable("x-powered-by");
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === "true") app.set("trust proxy", true);
else if (/^\d+$/.test(trustProxy || "")) app.set("trust proxy", Number(trustProxy));

app.use(requestContext);
app.use(securityHeaders);
app.use(sanitizeErrorResponses);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error("Origin is not allowed by CORS policy");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
    maxAge: 86400,
  })
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || "1mb" }));
app.use(express.static(path.join(backendRoot, "public"), { dotfiles: "deny", index: false, maxAge: "1h" }));
app.use(cookieParser());

// -------------------------
// Routes import (only existing routers)
// -------------------------
import authRouter from "./routes/auth/authRoutes.js";
import organizationRouter from "./routes/organization/organizationRoutes.js";
import apiRouter from "./routes/api.js";

// -------------------------
// Routes declaration
// -------------------------
// Health check and versioning can be provided by apiRouter
app.use("/api", apiRouter);

// Mount auth & organization under /api
app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// Export the configured app
export { app };
