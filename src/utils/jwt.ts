import jwt from "jsonwebtoken";
import { TJwtPayload } from "../types/auth.type";

export const generateAccessToken = (payload: TJwtPayload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: "1d",
  });
};

export const generateRefreshToken = (payload: TJwtPayload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  });
};