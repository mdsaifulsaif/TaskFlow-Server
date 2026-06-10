import express from "express";
import { LeaveController } from "./leave.controller";
import {
  auth,
  authorizeRole,
} from "../../middlewares/Auth & Role Middleware/auth.role.middleware";

const router = express.Router();

router.post(
  "/apply",
  auth,
  authorizeRole("employee", "admin"),
  LeaveController.applyLeave,
);
router.get("/all-leaves", LeaveController.getAllLeaves);
router.get("/:employee_id",
    auth,
    authorizeRole("employee"),
    LeaveController.getMyLeaves);
router.patch("/status/:id", LeaveController.updateLeaveStatus);

export const LeaveRoutes = router;
