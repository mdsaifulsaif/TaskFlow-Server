import express from "express";
import { LeaveController } from "./leave.controller";

const router = express.Router();

router.post("/apply", LeaveController.applyLeave);
router.get('/all-leaves', LeaveController.getAllLeaves);
router.get("/:employee_id", LeaveController.getMyLeaves);
router.patch('/status/:id', LeaveController.updateLeaveStatus);


export const LeaveRoutes = router;