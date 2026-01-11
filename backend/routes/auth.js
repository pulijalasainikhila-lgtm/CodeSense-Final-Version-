// routes/auth.js - Updated with Redis session and Celery welcome email
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sessionHelpers } = require("../config/redis");
const celeryClient = require("../utils/celeryClient");

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      email,
      password: hashed,
      role: role === "admin" ? "admin" : "user"
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store session in Redis
    await sessionHelpers.setUserSession(user._id.toString(), {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      token
    });

    // Cache user data
    await sessionHelpers.cacheUserData(user._id.toString(), {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    // Send welcome email via Celery (async - don't wait)
    celeryClient.sendWelcomeEmail(user.email, user.name)
      .then(task => console.log('Welcome email queued:', task.taskId))
      .catch(err => console.error('Error queuing welcome email:', err));

    res.json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check rate limiting
    const rateLimit = await sessionHelpers.checkRateLimit(`login:${email}`, 5, 900); // 5 attempts per 15 min
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: "Too many login attempts. Please try again later.",
        resetTime: rateLimit.resetTime
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store session in Redis
    await sessionHelpers.setUserSession(user._id.toString(), {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      token
    });

    // Cache user data
    await sessionHelpers.cacheUserData(user._id.toString(), {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    res.json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Delete session from Redis
      await sessionHelpers.deleteUserSession(decoded.id);
      await sessionHelpers.invalidateUserCache(decoded.id);
    }

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.json({ message: "Logged out" });
  }
});

// GET /api/auth/session - Get current session from Redis
// *************************************************************
router.get("/session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try to get from Redis first (faster)
    let userData = await sessionHelpers.getUserSession(decoded.id);
    
    if (!userData) {
      // If not in Redis, get from DB and cache it
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      };
      
      // Cache it
      await sessionHelpers.cacheUserData(decoded.id, userData);
    }

    res.json({ user: userData });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;