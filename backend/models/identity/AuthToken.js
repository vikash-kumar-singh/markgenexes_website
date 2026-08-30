import mongoose from "mongoose";

const authTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required() {
        return this.type !== "invitation";
      },
    },
    email: { type: String, trim: true, lowercase: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["email_verification", "password_reset", "invitation"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: Date,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
    collection: "auth_tokens",
  }
);

authTokenSchema.index({ user: 1, type: 1, isUsed: 1 });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AuthToken", authTokenSchema);
