import { Router } from "express";
import { UserRoute } from "../modules/user/user.route";
import { employeeRoutes } from "../modules/employee/employee.route";
import { DepartmentRoutes } from "../modules/department/department.route";
import { attendanceRoute } from "../modules/attendance/attendance.routes";
import { LeaveRoutes } from "../modules/leave/leave.routes";
import { NoticeRoutes } from "../modules/notice/notice.routes";
import { PayrollRoutes } from "../modules/payroll/payroll.routes";
import { officeRoutes } from "../modules/office/office.routes";


const router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: UserRoute,
  },
  {
    path: "/employee",
    route: employeeRoutes,
  },
  {
    path: "/departments",
    route: DepartmentRoutes,
  },
  {
    path: "/attendance",
    route: attendanceRoute,
  },
  {
    path: "/leave",
    route: LeaveRoutes,
  },
  {
    path: "/notice",
    route: NoticeRoutes,
  },
  {
    path: "/payroll",
    route: PayrollRoutes,
  },
  {
    path: "/office",
    route: officeRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;