import { Router } from "express";
import { attendanceController } from "./attendance.controller";

const router = Router();

// POST: /api/v1/attendance (Check-in)
router.post("/", attendanceController.markAttendanceDB);

// PATCH: /api/v1/attendance/checkout (Check-out)
router.patch("/checkout", attendanceController.checkoutAttendanceDB);

// GET: /api/v1/attendance/:employeeId
router.get("/:employeeId", attendanceController.getMyAttendanceDB);

export const attendanceRoute = router;