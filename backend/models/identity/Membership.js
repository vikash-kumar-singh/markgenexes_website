import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() {
        return this.status !== "invited";
      },
    },
    invitedEmail: { type: String, trim: true, lowercase: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    jobTitle: String,
    department: String,
    status: {
      type: String,
      enum: ["active", "inactive", "invited", "pending"],
      default: "active",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    invitationToken: {
      type: String,
      select: false,
    },
    invitationExpires: Date,
    joinedAt: Date,
    deactivatedAt: Date,
  },
  {
    timestamps: true,
    collection: "memberships",
  }
);

membershipSchema.index(
  { user: 1, organization: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);
membershipSchema.index(
  { organization: 1, invitedEmail: 1 },
  { unique: true, partialFilterExpression: { invitedEmail: { $type: "string" } } }
);
membershipSchema.index({ organization: 1, status: 1 });
membershipSchema.index({ status: 1 });

export default mongoose.model("Membership", membershipSchema);
