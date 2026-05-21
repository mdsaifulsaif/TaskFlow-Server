// import express from "express";
// import { NoticeController } from "./notice.controller";
// import { auth, authorizeRole } from "../../middlewares/Auth & Role Middleware/auth.role.middleware";


// const router = express.Router();


// router.post(
//   "/create",
//   // auth,
//   // authorizeRole('admin', 'hr'),
//   NoticeController.createNotice,
// );


// router.get(
//   "/",
//   auth,
//   authorizeRole('admin', 'hr', 'employee'),
//   NoticeController.getNotices,
// );

// export const NoticeRoutes = router;

import { Router } from "express";
import { createNotice, getNoticeById, getNotices } from "./notice.controller";


const router = Router();

// POST: /api/v1/notices (নতুন নোটিশ তৈরি ও সকেটে পুশ)
router.post("/create", createNotice);

// GET: /api/v1/notices (সব একটিভ নোটিশ দেখা)
router.get("/", getNotices);

router.get("/:id", getNoticeById);

export const NoticeRoutes = router;