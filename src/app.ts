import express, { Request, Response } from "express";
import cors from "cors";
import router from "./app/routes/routes";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use((req, res, next) => {
  console.log(" REQUEST HIT:", req.method, req.url);
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});

// user routes
app.use("/api/v1", router);

app.use(globalErrorHandler);

export default app;
