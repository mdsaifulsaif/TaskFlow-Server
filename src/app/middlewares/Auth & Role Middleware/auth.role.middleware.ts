import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ApiError } from "../../../errors/ApiError";
import { config } from "../../../config";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | string;
    }
  }
}

/**
 * 1. Auth Middleware
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization;
    console.log("acces token",token)

    if (!token || !token.startsWith("Bearer ")) {
      throw new ApiError(401, "You are not authorized!");
    }

    const tokenValue = token.split(" ")[1];

   
    const decoded = jwt.verify(
      tokenValue as string,
      config.jwt_access_secret as string 
    ) as JwtPayload;

    req.user = decoded; 
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, "Invalid token!"));
    } else {
      next(error);
    }
  }
};

/**
 * 2. Role Authorization Middleware:
 * @param roles - jemon: 'admin', 'hr', 'employee'
 */
export const authorizeRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as JwtPayload;



      // user er role p list a ache ki na 
      if (!user || !roles.includes(user.role)) {
        throw new ApiError(403, "You do not have permission to access this resource!");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};