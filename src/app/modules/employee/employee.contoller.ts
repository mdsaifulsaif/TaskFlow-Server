import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { EmployeeService } from "./employee.service";
import { sendResponse } from "../../../utils/sendResponse";

const createEmployee = catchAsync(async (req: Request, res: Response) => {
  const result = await EmployeeService.createEmployeeIntoDB(req.body);

  sendResponse(res, 201, {
    success: true,
    message: "Employee registered successfully",
    data: result,
  });

});

export const EmployeeController = {
  createEmployee,
};
