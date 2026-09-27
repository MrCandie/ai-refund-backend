import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import globalErrorController from "./controller/error.controller.js";
import AppError from "./utils/app-error.js";
import requestRouter from "./routes/request.router.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://ai-refund-sigma.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(helmet());

app.use(hpp());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use("/api", limiter);

app.disable("x-powered-by");

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("<h1>WELCOME</h1>");
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use("/api/v1/request", requestRouter);
// app.use("/api/v1/ambulance", ambulanceRoute);

app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorController);

const db = process.env.DATABASE;

async function startServer() {
  const port = process.env.PORT || 8080;

  console.log("🚀 Starting server...");

  try {
    if (!db) {
      console.error("❌ DATABASE env is not defined");
      process.exit(1);
    }

    console.log("🔌 Connecting to DB...");

    await mongoose.connect(db);

    console.log("✅ database connection successful");

    app.listen(port, () => {
      console.log(`🔥 app running on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    process.exit(1);
  }
}

startServer();
