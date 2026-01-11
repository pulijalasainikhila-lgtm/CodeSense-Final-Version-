const express = require("express");
const History = require("../models/History");
const auth = require("../middleware/auth");

const router = express.Router();

// POST /api/history  -> save an entry
// **********************************************
// currently not used.
router.post("/", auth, async (req, res) => {
  try {
    const { type, inputCode, language, targetLanguage, result } = req.body;

    const item = await History.create({
      user: req.user.id,
      type,
      inputCode,
      language,
      targetLanguage,
      result
    });

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/history -> get user's history
router.get("/", auth, async (req, res) => {
  try {
    const items = await History.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/history -> clear all user's history
router.delete("/", auth, async (req, res) => {
  try {
    await History.deleteMany({ user: req.user.id });
    res.json({ message: "History cleared successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/history/:id -> delete a specific history entry
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await History.findOne({ _id: req.params.id, user: req.user.id });
    
    if (!item) {
      return res.status(404).json({ error: "History item not found" });
    }

    await History.findByIdAndDelete(req.params.id);
    res.json({ message: "History item deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;