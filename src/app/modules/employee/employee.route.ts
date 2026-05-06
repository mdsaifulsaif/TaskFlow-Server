import express from "express";
import {
  auth,
  authorizeRole,
} from "../../middlewares/Auth & Role Middleware/auth.role.middleware";
import { EmployeeController } from "./employee.contoller";

const router = express.Router();

router.post(
  "/create",
  auth,
  authorizeRole("admin", "hr"),
  EmployeeController.createEmployee,
);

router.get(
  "/",
  auth,
  authorizeRole("admin", "hr"),
  EmployeeController.getAllEmployee,
);

export const employeeRoutes = router;
