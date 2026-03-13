const express = require("express");
const multer = require("multer");
const path = require("path");
const Case = require("../models/Case");
const User = require("../models/User");
const { auth, authorize } = require("../middleware/auth");
const { generateTrackingId } = require("../utils/trackingId");
const { runEscalationCheck } = require("../utils/escalation");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(process.cwd(), "uploads")),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});

const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and PDF files are allowed"));
    }
    cb(null, true);
  },
});

router.post(
  "/",
  auth,
  authorize("staff"),
  upload.single("attachment"),
  async (req, res) => {
    const trackingId = await generateTrackingId();

    const payload = {
      trackingId,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      department: req.body.department,
      location: req.body.location,
      severity: req.body.severity,
      anonymous: req.body.anonymous === "true",
      submitter: req.user.id,
      submitterName: req.body.anonymous === "true" ? "Anonymous" : req.user.name,
      attachment: req.file ? `/uploads/${req.file.filename}` : undefined,
    };

    const created = await Case.create(payload);
    return res.status(201).json(created);
  }
);

router.get("/", auth, async (req, res) => {
  await runEscalationCheck();

  const { role, id } = req.user;
  let query = {};

  if (role === "staff") {
    query = { submitter: id };
  }

  if (role === "case_manager") {
    query = { caseManager: id };
  }

  const list = await Case.find(query)
    .populate("caseManager", "name email")
    .sort({ createdAt: -1 });
  return res.json(list);
});

router.patch("/:id/assign", auth, authorize("secretariat"), async (req, res) => {
  const { caseManagerId } = req.body;

  const manager = await User.findById(caseManagerId);
  if (!manager || manager.role !== "case_manager") {
    return res.status(400).json({ message: "Invalid Case Manager" });
  }

  const updated = await Case.findByIdAndUpdate(
    req.params.id,
    {
      caseManager: caseManagerId,
      status: "Assigned",
      assignedAt: new Date(),
      $push: {
        notes: {
          author: req.user.id,
          authorName: req.user.name,
          message: `Assigned to ${manager.name}`,
        },
      },
    },
    { new: true }
  ).populate("caseManager", "name email");

  if (!updated) return res.status(404).json({ message: "Case not found" });
  return res.json(updated);
});

router.patch(
  "/:id/status",
  auth,
  authorize("case_manager", "secretariat"),
  async (req, res) => {
    const { status, note } = req.body;
    const allowed = ["In Progress", "Pending", "Resolved", "Escalated", "Assigned"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const targetCase = await Case.findById(req.params.id);
    if (!targetCase) return res.status(404).json({ message: "Case not found" });

    if (req.user.role === "case_manager" && String(targetCase.caseManager) !== req.user.id) {
      return res.status(403).json({ message: "You can only update assigned cases" });
    }

    targetCase.status = status;
    if (note) {
      targetCase.notes.push({ author: req.user.id, authorName: req.user.name, message: note });
      targetCase.lastResponseAt = new Date();
    }

    await targetCase.save();
    const populated = await Case.findById(targetCase._id).populate("caseManager", "name email");
    return res.json(populated);
  }
);

module.exports = router;
