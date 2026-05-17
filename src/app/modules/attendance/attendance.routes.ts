import { Router } from "express";
import { attendanceController } from "./attendance.controller";
import {
  auth,
  authorizeRole,
} from "../../middlewares/Auth & Role Middleware/auth.role.middleware";

const router = Router();

// POST: /api/v1/attendance (Check-in)
router.post(
  "/",
  auth,
  authorizeRole("employee", "admin", "hr"),
  attendanceController.markAttendance,
);

// PATCH: /api/v1/attendance/checkout (Check-out)
router.patch(
  "/checkout",
  auth,
  authorizeRole("employee", "admin", "hr"),
  attendanceController.checkoutAttendance,
);

// GET: /api/v1/attendance/:employeeId
router.get("/:employeeId", attendanceController.getMyAttendance);

router.get(
  "/admin/all-attendance",
  auth,
  authorizeRole("admin", "hr"),
  attendanceController.getAllAttendanceForAdmin,
);

export const attendanceRoute = router;
