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
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const searchTerm = (req.query.searchTerm as string) || undefined;
  const department_id = (req.query.department_id as string) || undefined;

  const result = await EmployeeService.getAllEmployeeDB(
    page, 
    limit, 
    searchTerm, 
    department_id
  );

  sendResponse(res, 200, {
    success: true,
    message: "Employees fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});


const updateEmployee = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await EmployeeService.updateEmployeeInDB(id as string, req.body);

  sendResponse(res, 200, {
    success: true,
    message: "Employee updated successfully",
    data: result,
  });
});

const deleteEmployee = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; 
  await EmployeeService.deleteEmployeeFromDB(id as string);

  sendResponse(res, 200, {
    success: true,
    message: "Employee deactivated successfully (Soft Delete)",
    data: null,
  });
});

export const EmployeeController = {
  createEmployee,
  getAllEmployee,
  updateEmployee,
  deleteEmployee
};
