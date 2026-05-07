import { Router } from "express";
import { attendanceController } from "./attendance.controller";

const router = Router();

// POST: /api/v1/attendance (Check-in)
router.post("/", attendanceController.markAttendance);

// PATCH: /api/v1/attendance/checkout (Check-out)
router.patch("/checkout", attendanceController.checkoutAttendance);

export const attendanceRoute = router;