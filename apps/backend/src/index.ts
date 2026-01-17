import express from "express";
import cors from "cors";
import { requireBackendKey } from "./middleware/auth";
import ankiRouter from "./routes/anki";
import pdfRouter from "./routes/pdf";
import dotenv from "dotenv";
dotenv.config();


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "soma-backend" });
});

// Protected routes - require backend API key
app.use("/anki", requireBackendKey, ankiRouter);
app.use("/pdf", requireBackendKey, pdfRouter);

// Start server
app.listen(PORT, () => {
  console.log(`[BACKEND] Server running on port ${PORT}`);
  console.log(`[BACKEND] Environment: ${process.env.NODE_ENV || "development"}`);
  if (!process.env.BACKEND_API_KEY) {
    console.warn("[BACKEND] ⚠️  BACKEND_API_KEY not set - allowing all requests in dev mode");
  }
});
