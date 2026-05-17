import { Request, Response } from "express";
import { LeaveService } from "./leave.service";
import { sendResponse } from "../../../utils/sendResponse";
import { ApiError } from "../../../errors/ApiError";
import { catchAsync } from "../../../utils/catchAsync";

const applyLeave = catchAsync(async (req: Request, res: Response) => {
  const { leave_type, start_date, end_date, reason } = req.body;

  // আপনার ইউজার যদি লগইন করা থাকে, তবে req.user থেকে employee_id নিন
  // আপাতত আপনার logic অনুযায়ী body থেকে নিচ্ছি
  const { employee_id } = req.body;

  if (!employee_id || !leave_type || !start_date || !end_date) {
    throw new ApiError(400, "সবগুলো প্রয়োজনীয় তথ্য প্রদান করুন।");
  }

  // তারিখ চেক করা (ঐচ্ছিক কিন্তু ভালো প্র্যাকটিস)
  if (new Date(start_date) > new Date(end_date)) {
    throw new ApiError(400, "শুরুর তারিখ শেষ তারিখের চেয়ে বড় হতে পারে না।");
  }

  const result = await LeaveService.applyLeaveDB(
    employee_id,
    leave_type,
    start_date,
    end_date,
    reason,
  );

  sendResponse(res, 201, {
    success: true,
    message: "ছুটির আবেদনটি সফলভাবে জমা হয়েছে।",
    data: result,
  });
});

const updateLeaveStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; // leave_requests table id
  const { status } = req.body; // 'approved' or 'rejected'

  if (!["approved", "rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status. Use 'approved' or 'rejected'.");
  }

  const result = await LeaveService.approveLeaveDB(id as string, status);

  sendResponse(res, 200, {
    success: true,
    message: `Leave request has been ${status} successfully.`,
    data: result,
  });
});



 const getAllLeaves = catchAsync(async (req: Request, res: Response) => {
  const { 
    employeeId, 
    departmentId, 
    status, 
    startDate, 
    endDate, 
    page, 
    limit 
  } = req.query;

  // tsconfig-এর exactOptionalPropertyTypes এরর ফিক্সিং স্ট্রাকচার
  const filters = {
    employeeId: employeeId ? String(employeeId) : undefined,
    departmentId: departmentId ? String(departmentId) : undefined,
    status: status ? (String(status) as 'pending' | 'approved' | 'rejected') : undefined,
    startDate: startDate ? String(startDate) : undefined,
    endDate: endDate ? String(endDate) : undefined,
    page: page ? parseInt(String(page), 10) : 1,
    limit: limit ? parseInt(String(limit), 10) : 10,
  };

 
  const result = await LeaveService.getActiveEmployeeLeavesDB(filters);

  
  sendResponse(res, 200, {
    success: true,
    message: "Leaves fetched successfully",
    meta: result.meta,
    data: result.leaves,
  });
});

const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const { employee_id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const { leaves, meta } = await LeaveService.getEmployeeLeavesDB(
      employee_id as string,
      page,
      limit,
      startDate,
      endDate,
    );

    sendResponse(res, 200, {
      success: true,
      message: "Leaves fetched successfully",
      meta,
      data: leaves,
    });
  } catch (error: any) {
    sendResponse(res, 500, {
      success: false,
      message: error.message,
    });
  }
};

export const LeaveController = {
  applyLeave,
  getMyLeaves,
  updateLeaveStatus,
  getAllLeaves
};
