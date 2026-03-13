const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const caseSchema = new mongoose.Schema(
  {
    trackingId: { type: String, unique: true, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["Safety", "Policy", "Facilities", "HR", "Other"],
      required: true,
    },
    department: { type: String, required: true },
    location: { type: String, required: true },
    severity: { type: String, enum: ["Low", "Medium", "High"], required: true },
    anonymous: { type: Boolean, default: false },
    submitterName: { type: String },
    submitter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    attachment: { type: String },
    status: {
      type: String,
      enum: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Escalated"],
      default: "New",
    },
    caseManager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    lastResponseAt: { type: Date },
    escalatedAt: { type: Date },
    reminderSentAt: { type: Date },
    notes: [noteSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Case", caseSchema);
