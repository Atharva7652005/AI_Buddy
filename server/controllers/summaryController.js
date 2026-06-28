const { v4: uuidv4 } = require("uuid");
const Session = require("../models/Session");
const { generateCumulativeSummary, generateTitle } = require("../utils/llm");

const createNewSession = async (req, res) => {
  try {
    const sessionId = uuidv4();
    const session = new Session({ sessionId });
    await session.save();

    return res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      title: session.title,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return res.status(500).json({ success: false, error: "Failed to create new session" });
  }
};

const updateSummary = async (req, res) => {
  try {
    const { sessionId, prompt, response } = req.body;

    if (!sessionId || !prompt || !response) {
      return res.status(400).json({ success: false, error: "Missing required fields: sessionId, prompt, or response" });
    }

    let session = await Session.findOne({ sessionId });
    if (!session) {
      session = new Session({ sessionId });
    }

    const previousSummary = session.summary;
    let titlePromise = null;

    // Generate title if it's a new/empty session
    if (!previousSummary || session.title === "New Session") {
      titlePromise = generateTitle(prompt);
    }

    const summaryPromise = generateCumulativeSummary(previousSummary, prompt, response);

    if (titlePromise) {
      const [newTitle, newSummary] = await Promise.all([titlePromise, summaryPromise]);
      session.title = newTitle;
      session.summary = newSummary;
    } else {
      session.summary = await summaryPromise;
    }
    await session.save();

    return res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      summary: session.summary,
      title: session.title,
    });
  } catch (error) {
    console.error("Error updating summary:", error);
    return res.status(500).json({ success: false, error: "Failed to update summary" });
  }
};

const getHistory = async (req, res) => {
  try {
    // Return all sessions sorted by updatedAt descending
    const sessions = await Session.find({}, 'sessionId title updatedAt')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
};

const getSessionSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findOne({ sessionId: id });

    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    return res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      summary: session.summary,
      title: session.title,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch session" });
  }
};

module.exports = {
  createNewSession,
  updateSummary,
  getHistory,
  getSessionSummary,
};
