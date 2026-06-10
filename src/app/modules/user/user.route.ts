import express from "express";
import * as UserController from "./user.controller";
import { refreshToken } from "./user.service";

const router = express.Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post(
  '/refresh-token',
  refreshToken
);  

export const UserRoute = router;