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


const getAllEmployee = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;


  const result = await EmployeeService.getAllEmployeeDB(page, limit) as any;

  sendResponse(res, 200, {
    success: true,
    message: "Employees fetched successfully",
    meta: result.meta, 
    data: result.data, 
  });
});



export const EmployeeController = {
  createEmployee,
  getAllEmployee
};
