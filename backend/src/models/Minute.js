const mongoose = require("mongoose");

const minuteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Minute", minuteSchema);
