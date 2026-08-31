import mongoose from "mongoose";

const partnerProfileSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerApplication",
    },
    partnerName: {
      type: String,
      required: [true, "Partner name is required"],
    },
    partnerType: {
      type: String,
      enum: ["university", "company", "agency", "reseller", "integration", "other"],
    },
    primaryContact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    agreementDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    agreementDate: Date,
    expirationDate: Date,
    autoRenew: Boolean,
    commissionRate: mongoose.Schema.Types.Decimal128,
    supportLevel: {
      type: String,
      enum: ["basic", "standard", "premium"],
      default: "standard",
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    notes: String,
  },
  {
    timestamps: true,
    collection: "partner_profiles",
  }
);

partnerProfileSchema.index({ organization: 1, status: 1 });
partnerProfileSchema.index({ expirationDate: 1 });

export default mongoose.model("PartnerProfile", partnerProfileSchema);
