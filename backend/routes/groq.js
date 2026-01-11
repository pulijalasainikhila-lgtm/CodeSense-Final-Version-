const express = require("express");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));
const auth = require("../middleware/auth");
const History = require("../models/History");

const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";

// Middleware to block admin users from using explain/convert features
const blockAdmin = (req, res, next) => {
  if (req.user.role === "admin") {
    return res.status(403).json({ 
      error: "Admins cannot use code explanation or conversion features. Please use a regular user account." 
    });
  }
  next();
};
// groq api call function
async function callGroq(prompt) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "You are CodeSense, an AI that explains code clearly and concisely for students." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Groq error:", text);
    throw new Error("Groq API error");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response from model.";
}

// POST /api/groq/explain - Block admins
router.post("/explain", auth, blockAdmin, async (req, res) => {
  try {
    const { code, language } = req.body;
    const prompt = `Explain the following ${language || "code"} step by step in simple terms:

${code}`;
    const result = await callGroq(prompt);

    const history = await History.create({
      user: req.user.id,
      type: "explain",
      inputCode: code,
      language,
      result
    });

    res.json({ result, historyId: history._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

// POST /api/groq/convert - Block admins
router.post("/convert", auth, blockAdmin, async (req, res) => {
  try {
    const { code, fromLanguage, toLanguage } = req.body;
    const prompt = `Convert the following ${fromLanguage} code to ${toLanguage}. Only return code, no explanation:

${code}`;
    const result = await callGroq(prompt);

    const history = await History.create({
      user: req.user.id,
      type: "convert",
      inputCode: code,
      language: fromLanguage,
      targetLanguage: toLanguage,
      result
    });

    res.json({ result, historyId: history._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

module.exports = router;