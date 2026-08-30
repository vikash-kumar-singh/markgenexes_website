import mongoose from "mongoose";
import { validateEnvironment } from "./config/environment.js";
import connectDB from "./db/db.js";
import { app } from "./app.js";

let server;
let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully`);

  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  clearTimeout(forceExit);
  process.exitCode = exitCode;
}

async function start() {
  const { port } = validateEnvironment();
  await connectDB();
  server = app.listen(port, () => console.log(`MarkGenexes API listening on port ${port}`));
  server.on("error", (error) => {
    console.error("HTTP server error", error);
    void shutdown("server-error", 1);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection", error);
  void shutdown("unhandled-rejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception", error);
  void shutdown("uncaught-exception", 1);
});

start().catch((error) => {
  console.error("API startup failed", error);
  process.exitCode = 1;
});
