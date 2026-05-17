import { Request, Response } from "express";

import { attendanceService } from "./attendance.service";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    employee_id: string;
    office_id: number | null; // অফিস আইডি নাম্বার বা নাল হতে পারে
  };
}
// ==========================================
// ১. চেক-ইন কন্ট্রোলার (Mark Attendance)
// ==========================================
const markAttendance = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { lat, lon } = req.body;

    const employee_id = req.user?.employee_id;
    const office_id = req.user?.office_id;

    if (
      !employee_id ||
      typeof employee_id !== "string" ||
      lat === undefined ||
      lon === undefined ||
      !office_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid employee_id, lat, lon, and office_id.",
      });
    }

    try {
      const result = await attendanceService.markAttendance(
        employee_id,
        Number(lat),
        Number(lon),
        Number(office_id),
      );

      return sendResponse(res, 201, {
        success: true,
        message: "Attendance marked successfully. Welcome to work!",
        data: result,
      });
    } catch (error: any) {
      console.error("Check-in Error:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "An error occurred during check-in.",
      });
    }
  },
);

// ==========================================
// ২. চেক-আউট কন্ট্রোলার (Checkout Attendance)
// ==========================================
const checkoutAttendance = catchAsync(
  async (req: AuthenticatedRequest, res: Response) => {
    const { lat, lon } = req.body;

    const employee_id = req.user?.employee_id;
    const office_id = req.user?.office_id;

    if (
      !employee_id ||
      typeof employee_id !== "string" ||
      lat === undefined ||
      lon === undefined ||
      !office_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid employee_id, lat, lon, and office_id.",
      });
    }

    try {
      // সার্ভিসে সবকটি প্যারামিটার নাম্বার ফরম্যাটে কনভার্ট করে পাঠানো হলো
      const result = await attendanceService.checkoutFromDB(
        employee_id,
        Number(lat),
        Number(lon),
        Number(office_id), // 👈 সার্ভিসে আইডিটি পাস করা হলো
      );

      return sendResponse(res, 200, {
        success: true,
        message: "Checked out successfully. Have a great day!",
        data: result,
      });
    } catch (error: any) {
      console.error("Check-out Error:", error.message);
      // কাস্টম এরর মেসেজ (যেমন: "No check-in record found") ফ্রন্টএন্ডে সুইটঅ্যালার্টের জন্য পাঠানো হলো
      return res.status(400).json({
        success: false,
        message: error.message || "An error occurred during check-out.",
      });
    }
  },
);

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
    endDate,
  );

  sendResponse(res, 200, {
    success: true,
    message: "Attendance history fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllAttendanceForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchTerm = req.query.searchTerm as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    console.log("req middleware user", req.user);
    const result = await attendanceService.getAllAttendanceForAdminFromDB(
      page,
      limit,
      searchTerm,
      startDate,
      endDate,
    );

    sendResponse(res, 200, {
      success: true,
      message: "All employee attendance fetched successfully",
      meta: result.meta,
      data: result.data,
      summary: result.summary,
    });
  },
);

export const attendanceController = {
  markAttendance,
  checkoutAttendance,
  getMyAttendance,
  getAllAttendanceForAdmin,
};
