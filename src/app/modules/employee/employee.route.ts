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

router.patch(
  "/:id",
  auth,
  authorizeRole("admin"),
  EmployeeController.updateEmployee
);

router.delete(
  "/:id",
  auth,
  authorizeRole("admin"),
  EmployeeController.deleteEmployee
);

export const employeeRoutes = router;
