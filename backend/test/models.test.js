import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { AuthToken, Membership, Role } from "../models/index.js";

const organization = new mongoose.Types.ObjectId();
const role = new mongoose.Types.ObjectId();

test("an invitation can be persisted before the invited user registers", async () => {
  const invitation = new Membership({
    invitedEmail: "new.user@example.technology",
    organization,
    role,
    status: "invited",
  });
  await invitation.validate();

  const authToken = new AuthToken({
    email: "new.user@example.technology",
    organization,
    token: "test-invitation-token",
    type: "invitation",
    expiresAt: new Date(Date.now() + 60_000),
  });
  await authToken.validate();
});

test("active memberships still require a registered user", async () => {
  const membership = new Membership({ organization, role, status: "active" });
  await assert.rejects(() => membership.validate(), /user/i);
});

test("role names are unique within an organization, not globally", () => {
  const organizationNameIndex = Role.schema.indexes().find(
    ([fields]) => fields.organization === 1 && fields.name === 1
  );
  assert.ok(organizationNameIndex);
  assert.equal(organizationNameIndex[1].unique, true);
  assert.equal(Role.schema.path("name").options.unique, undefined);
});
