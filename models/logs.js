const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    refundRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefundRequest",
      required: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

export default mongoose.model("AuditLog", auditLogSchema);
