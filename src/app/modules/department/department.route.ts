import express from "express";
import { auth, authorizeRole } from "../../middlewares/Auth & Role Middleware/auth.role.middleware";
import { departmentContoller } from "./department.controller";
 

const router = express.Router();

router.post(
  "/create",
  auth, 
  authorizeRole("admin", "hr"),
  departmentContoller.crateDepartment
);


// router.get(
//   "/",
//   auth,
//   DepartmentController.getAllDepartments
// );

export const DepartmentRoutes = router;