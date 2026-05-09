import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { DepartmentService } from "./department.service";
import { sendResponse } from "../../../utils/sendResponse";

const crateDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.createDepartmentDB(req.body);
  sendResponse(res, 201, {
    success: true,
    message: "Department registered successfully",
    data: result,
  });
});

const getDepartments = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await DepartmentService.getAllDepartmentDB(page, limit);

  sendResponse(res, 200, {
    success: true,
    message: "Departments fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const departmentContoller = {
  crateDepartment,
  getDepartments,
};
