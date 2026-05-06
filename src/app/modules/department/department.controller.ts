import { Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { DepartmentService } from "./department.service";
import { sendResponse } from "../../../utils/sendResponse";

const crateDepartment = catchAsync(async(req: Request, res: Response) => {
  const result = await DepartmentService.createDepartmentDB(req.body);
  sendResponse(res, 201, {
      success: true,
      message: "Department registered successfully",
      data: result,
    });
  
});

export const departmentContoller = {
  crateDepartment,
};
