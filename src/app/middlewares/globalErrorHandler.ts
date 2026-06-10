import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../errors/ApiError";


export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Something went wrong";

  // Custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // PostgreSQL error (optional handling)
  else if (err.code === "23505") {
    statusCode = 400;
    message = "Duplicate entry (email already exists)";
  }

  //  JWT error (future use)
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  // Default error
  else {
    message = err.message || message;
  }

  //  Debug log (important)
  console.error(" ERROR:", err);

  res.status(statusCode).json({
    success: false,
    message,
  });
};
