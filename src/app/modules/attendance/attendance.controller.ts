import { Request, Response } from "express";

import { attendanceService } from "./attendance.service";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";


// Handle Employee Check-in
const markAttendance = catchAsync(async (req: Request, res: Response) => {

  const { employee_id, lat, lon, office_id } = req.body;


  if (!employee_id || !lat || !lon || !office_id) {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide employee_id, lat, lon, and office_id." 
    });
  }


  const result = await attendanceService.markAttendance(
    employee_id, 
    lat, 
    lon, 
    office_id
  );

  sendResponse(res, 201, {
    success: true,
    message: "Attendance marked successfully. Welcome to work!",
    data: result,
  });
});

// Handle Employee Check-out
const checkoutAttendance = catchAsync(async (req: Request, res: Response) => {
  const { employee_id, lat, lon } = req.body;

  // Validation if data is missing
  if (!employee_id || !lat || !lon) {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide employee_id, lat, and lon for checkout." 
    });
  }

  const result = await attendanceService.checkoutFromDB(employee_id, lat, lon);

  sendResponse(res, 200, {
    success: true,
    message: "Checked out successfully. Have a great day!",
    data: result,
  });
});

const getMyAttendance = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  

//   query paramiter theke date filter data niya
  const startDate = req.query.startDate as string; 
  const endDate = req.query.endDate as string;

  const result = await attendanceService.getAllAttendanceByEmployeeFromDB(
    employeeId as string,
    page,
    limit,
    startDate,
    endDate
  );

  sendResponse(res, 200, {
    success: true,
    message: "Attendance history fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllAttendanceForAdmin = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const searchTerm = req.query.searchTerm as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  const result = await attendanceService.getAllAttendanceForAdminFromDB(
    page,
    limit,
    searchTerm,
    startDate,
    endDate
  );

  sendResponse(res, 200, {
    success: true,
    message: "All employee attendance fetched successfully",
    meta: result.meta,
    data: result.data,
    summary: result.summary,
  });
});


export const attendanceController = {
  markAttendance,
  checkoutAttendance,
  getMyAttendance,
  getAllAttendanceForAdmin
};