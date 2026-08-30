import assert from "node:assert/strict";
import { after, before, test } from "node:test";

let baseUrl;
let server;

before(async () => {
  const { app } = await import("../app.js");
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("health endpoint returns service metadata and security headers", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "markgenexes-api");
  assert.ok(body.requestId);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
});

test("readiness endpoint reports unavailable database", async () => {
  const response = await fetch(`${baseUrl}/api/v1/ready`);
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.status, "not-ready");
  assert.equal(body.database, "disconnected");
});

test("unknown API paths return a structured 404", async () => {
  const response = await fetch(`${baseUrl}/api/v1/does-not-exist`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error, "API endpoint not found");
  assert.ok(body.requestId);
});

test("invalid JSON receives a structured 400", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{invalid",
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error, "Request body contains invalid JSON");
});

test("unapproved browser origins are rejected", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    headers: { origin: "https://unapproved.example" },
  });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.match(body.error, /not allowed/i);
});
