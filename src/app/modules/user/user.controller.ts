import { Request, Response } from "express";
import * as UserService from "./user.service";
import { sendResponse } from "../../../utils/sendResponse";
import { catchAsync } from "../../../utils/catchAsync";

export const register = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const user = await UserService.registerUser(name, email, password);

  sendResponse(res, 201, {
    success: true,
    message: "User registered successfully",
    data: user,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const tokens = await UserService.loginUser(email, password);

  sendResponse(res, 200, {
    success: true,
    message: "Login successful",
    data: tokens,
  });
});
