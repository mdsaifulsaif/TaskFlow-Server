import express from "express";
import { NoticeController } from "./notice.controller";
import { auth, authorizeRole } from "../../middlewares/Auth & Role Middleware/auth.role.middleware";


const router = express.Router();


router.post(
  "/create",
  auth,
  authorizeRole('admin', 'hr'),
  NoticeController.createNotice,
);


router.get(
  "/",
  auth,
  authorizeRole('admin', 'hr', 'employee'),
  NoticeController.getNotices,
);

export const NoticeRoutes = router;
