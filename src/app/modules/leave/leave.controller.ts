import { Request, Response } from "express";
import { LeaveService } from "./leave.service";
import { sendResponse } from "../../../utils/sendResponse";


const applyLeave = async (req: Request, res: Response) => {
  try {
    const { employee_id, leave_type, start_date, end_date, reason } = req.body;

    if (!employee_id || !leave_type || !start_date || !end_date) {
      return sendResponse(res, 400, {
        success: false,
        message: "Missing required fields",
      });
    }

    const leave = await LeaveService.applyLeaveDB(
      employee_id,
      leave_type,
      start_date,
      end_date,
      reason
    );

    sendResponse(res, 201, {
      success: true,
      message: "Leave applied successfully",
      data: leave,
    });
  } catch (error: any) {
    sendResponse(res, 500, {
      success: false,
      message: error.message,
    });
  }
};

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
      endDate
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
};