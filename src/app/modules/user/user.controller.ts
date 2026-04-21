import { Request, Response } from "express";
import * as UserService from "./user.service";

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const user = await UserService.registerUser(name, email, password);

  res.json({
    success: true,
    data: user,
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const tokens = await UserService.loginUser(email, password);

  res.json({
    success: true,
    data: tokens,
  });
};