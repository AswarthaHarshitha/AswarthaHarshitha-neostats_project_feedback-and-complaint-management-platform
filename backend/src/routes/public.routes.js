const express = require("express");
const multer = require("multer");
const path = require("path");
const Case = require("../models/Case");
const Minute = require("../models/Minute");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(process.cwd(), "uploads")),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});

const upload = multer({ storage });

router.get("/digest", auth, async (_, res) => {
  const digest = await Case.find({ status: "Resolved" })
    .sort({ updatedAt: -1 })
    .limit(10)
    .select("trackingId title category department updatedAt notes");

  res.json(digest);
});

router.get("/impact", auth, async (_, res) => {
  const resolved = await Case.find({ status: "Resolved" })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select("title notes");

  const result = resolved.map((item) => {
    const action = item.notes?.[item.notes.length - 1]?.message || "Case closed";
    return {
      raised: item.title,
      action,
      changed: `Resolved and tracked under ${item._id}`,
    };
  });

  res.json(result);
});

router.get("/minutes", auth, async (req, res) => {
  const query = req.query.search
    ? { title: { $regex: String(req.query.search), $options: "i" } }
    : {};
  const minutes = await Minute.find(query).sort({ createdAt: -1 });
  res.json(minutes);
});

router.post(
  "/minutes",
  auth,
  authorize("secretariat"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "PDF upload is required" });

    const created = await Minute.create({
      title: req.body.title,
      filePath: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id,
    });

    res.status(201).json(created);
  }
);

module.exports = router;
