import { Router } from "express";
import { UserRoute } from "../modules/user/user.route";
import { employeeRoutes } from "../modules/employee/employee.route";


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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;