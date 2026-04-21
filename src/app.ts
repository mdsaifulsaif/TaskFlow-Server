import express, { Request, Response } from "express";
import cors from "cors";
import userRoutes from "./app/modules/user/user.route";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("🔥 REQUEST HIT:", req.method, req.url);
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Backend is running 🚀",
  });
});

// user routes
app.use("/api/v1/users", userRoutes);

export default app;
