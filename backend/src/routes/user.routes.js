const express = require("express");
const User = require("../models/User");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, authorize("admin", "secretariat"), async (_, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

router.post("/", auth, authorize("admin"), async (req, res) => {
  const { name, email, password, role, department } = req.body;
  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) return res.status(400).json({ message: "Email already exists" });

  const created = await User.create({ name, email, password, role, department });
  res.status(201).json({
    id: created._id,
    name: created.name,
    email: created.email,
    role: created.role,
    department: created.department,
  });
});

module.exports = router;
