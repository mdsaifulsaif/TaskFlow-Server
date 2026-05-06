import { Router } from "express";
import { UserRoute } from "../modules/user/user.route";
import { employeeRoutes } from "../modules/employee/employee.route";
import { DepartmentRoutes } from "../modules/department/department.route";


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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;