const Counter = require("../models/Counter");

const generateTrackingId = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: "case", year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const padded = String(counter.seq).padStart(3, "0");
  return `NEO-${year}-${padded}`;
};

module.exports = { generateTrackingId };
