import { Request, Response } from "express";

import { attendanceService } from "./attendance.service";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";

// Handle Employee Check-in
const markAttendance = catchAsync(async (req: Request, res: Response) => {
  const { employee_id, lat, lon } = req.body;

  // Validation if data is missing
  if (!employee_id || !lat || !lon) {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide employee_id, lat, and lon." 
    });
  }

  const result = await attendanceService.markAttendance(employee_id, lat, lon);

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



export const attendanceController = {
  markAttendance,
  checkoutAttendance,
};