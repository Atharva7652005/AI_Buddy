const express = require("express");
const router = express.Router();
const {
  createNewSession,
  updateSummary,
  getHistory,
  getSessionSummary,
} = require("../controllers/summaryController");

// Create a new session
router.post("/session/new", createNewSession);

// Update summary for a session
router.post("/summary/update", updateSummary);

// Get all history
router.get("/history", getHistory);

// Get specific session summary
router.get("/history/:id", getSessionSummary);

module.exports = router;
