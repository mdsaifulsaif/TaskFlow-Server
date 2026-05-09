import { Request, Response } from "express";
import { PayrollService } from "./payroll.service";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";

const generatePayroll = catchAsync(async (req: Request, res: Response) => {
  const { month } = req.body; 
  const result = await PayrollService.generateMonthlyPayrollDB(month);

  sendResponse(res, 201, {
    success: true,
    message: result.message,
    data: result,
  });
});

const paySalary = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PayrollService.markAsPaidDB(id as string);

  sendResponse(res, 200, {
    success: true,
    message: "Salary payment successful",
    data: result,
  });
});

const getAllPayrolls = catchAsync(async (req: Request, res: Response) => {
  const result = await PayrollService.getAllPayrollDB();

  sendResponse(res, 200, {
    success: true,
    message: "Payrolls fetched successfully",
    data: result,
  });
});

export const PayrollController = {
  generatePayroll,
  paySalary,
  getAllPayrolls
};