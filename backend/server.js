require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { redisClient } = require("./config/redis");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const historyRoutes = require("./routes/history");
const adminRoutes = require("./routes/admin");
const adminEmailRoutes = require("./routes/admin-email");
const groqRoutes = require("./routes/groq");

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/email", adminEmailRoutes);
app.use("/api/groq", groqRoutes);

// Static files
app.use(express.static(path.join(__dirname, "..", "public")));

// Catch-all route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and Redis, then start server
Promise.all([
  connectDB(),
  redisClient.ping() // Test Redis connection
])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Redis connected and ready`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

  // Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await redisClient.quit();
  process.exit(0);
});