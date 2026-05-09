import express from "express";
import { PayrollController } from "./payroll.controller";



const router = express.Router();

//  (Admin/HR)
router.post(
  "/generate",
  // auth('admin', 'hr'),
  PayrollController.generatePayroll
);

//  ( Admin/HR)
router.patch(
  "/pay/:id",
  // auth('admin', 'hr'),
  PayrollController.paySalary
);

router.get("/", PayrollController.getAllPayrolls);


// router.get("/my-salary", auth('employee'), PayrollController.getMyPayroll);

export const PayrollRoutes = router;