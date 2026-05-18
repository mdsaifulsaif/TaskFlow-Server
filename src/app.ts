import express, { Request, Response } from "express";
import cors from "cors";
import router from "./app/routes/routes";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandler";


const app = express();

app.use(cors());
app.use(express.json());

app.use(cors({
  origin: ['http://localhost:3000','http://localhost:3001','http://localhost:3002'], 
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  console.log(" REQUEST HIT:", req.method, req.url);
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Backend is running ",
  });
});

// user routes
app.use("/api/v1", router);

app.use(globalErrorHandler);

export default app;
