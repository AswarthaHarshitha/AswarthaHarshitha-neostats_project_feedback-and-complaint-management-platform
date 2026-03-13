const express = require("express");
const Case = require("../models/Case");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

router.get("/dashboard", auth, authorize("secretariat", "admin"), async (_, res) => {
  const openStatuses = ["New", "Assigned", "In Progress", "Pending", "Escalated"];

  const [byStatus, byCategory, byDepartment, openByDepartment, hotspotRaw] = await Promise.all([
    Case.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Case.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    Case.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]),
    Case.aggregate([
      { $match: { status: { $in: openStatuses } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Case.aggregate([
      { $match: { status: { $in: openStatuses } } },
      { $group: { _id: { department: "$department", category: "$category" }, count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const toSimple = (arr) => arr.map((item) => ({ name: item._id, count: item.count }));

  res.json({
    byStatus: toSimple(byStatus),
    byCategory: toSimple(byCategory),
    byDepartment: toSimple(byDepartment),
    openByDepartment: toSimple(openByDepartment),
    hotspots: hotspotRaw.map((h) => ({
      department: h._id.department,
      category: h._id.category,
      count: h.count,
      flagged: true,
    })),
  });
});

module.exports = router;
