const Case = require("../models/Case");
const { workingDaysBetween } = require("./workingDays");

const runEscalationCheck = async () => {
  const activeCases = await Case.find({
    status: { $in: ["Assigned", "In Progress", "Pending"] },
    assignedAt: { $exists: true, $ne: null },
    lastResponseAt: { $in: [null, undefined] },
  });

  const now = new Date();
  const updates = [];

  for (const c of activeCases) {
    const days = workingDaysBetween(c.assignedAt, now);
    if (days > 7) {
      c.status = "Escalated";
      c.escalatedAt = now;
      c.reminderSentAt = now;
      c.notes.push({
        message: "System escalation: no case manager response in 7 working days.",
        authorName: "System",
      });
      updates.push(c.save());
    }
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  return updates.length;
};

module.exports = { runEscalationCheck };
