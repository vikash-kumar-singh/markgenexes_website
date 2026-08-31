import mongoose from "mongoose";

const partnerApplicationSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    applicationType: {
      type: String,
      enum: ["university", "company", "agency", "reseller", "integration", "other"],
      required: true,
    },
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
    },
    contactName: {
      type: String,
      required: [true, "Contact name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
    },
    phone: String,
    website: String,
    description: String,
    documents: [
      {
        name: String,
        file: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MediaAsset",
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    rejectionReason: String,
    notes: String,
  },
  {
    timestamps: true,
    collection: "partner_applications",
  }
);

partnerApplicationSchema.index({ site: 1, status: 1 });
partnerApplicationSchema.index({ email: 1 });

export default mongoose.model("PartnerApplication", partnerApplicationSchema);
