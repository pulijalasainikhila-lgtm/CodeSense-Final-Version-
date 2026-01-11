const express = require("express");
const User = require("../models/User");
const History = require("../models/History");
const auth = require("../middleware/auth");

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
};

// GET /api/admin/users
router.get("/users", auth, requireAdmin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", auth, requireAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await History.deleteMany({ user: req.params.id });
  res.json({ message: "User deleted" });
});

// GET /api/admin/stats - FIXED
router.get("/stats", auth, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalHistory = await History.countDocuments();
    
    // Fixed: Group by 'type' field correctly
    const byType = await History.aggregate([
      { 
        $group: { 
          _id: "$type", 
          count: { $sum: 1 } 
        } 
      },
      {
        $project: {
          type: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({ 
      totalUsers, 
      totalHistory, 
      byType 
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;