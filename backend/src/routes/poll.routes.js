const express = require("express");
const Poll = require("../models/Poll");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, authorize("secretariat"), async (req, res) => {
  const { question, options } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: "Question and at least two options are required" });
  }

  const poll = await Poll.create({
    question,
    options: options.map((opt) => ({ label: opt, votes: 0 })),
    createdBy: req.user.id,
  });

  res.status(201).json(poll);
});

router.get("/", auth, async (_, res) => {
  const polls = await Poll.find().sort({ createdAt: -1 });
  res.json(polls);
});

router.post("/:id/vote", auth, authorize("staff"), async (req, res) => {
  const { optionIndex } = req.body;

  const poll = await Poll.findById(req.params.id);
  if (!poll) return res.status(404).json({ message: "Poll not found" });

  const userId = req.user.id;
  if (poll.voters.some((id) => String(id) === userId)) {
    return res.status(400).json({ message: "You have already voted in this poll" });
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return res.status(400).json({ message: "Invalid option" });
  }

  poll.options[optionIndex].votes += 1;
  poll.voters.push(userId);
  await poll.save();

  return res.json(poll);
});

module.exports = router;
