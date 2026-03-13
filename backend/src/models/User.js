const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["staff", "secretariat", "case_manager", "admin"],
      required: true,
      default: "staff",
    },
    department: { type: String, default: "General" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(raw) {
  return bcrypt.compare(raw, this.password);
};

module.exports = mongoose.model("User", userSchema);
