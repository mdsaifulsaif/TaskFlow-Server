import { Request, Response } from "express";

import { NoticeService } from "./notice.service";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";

const createNotice = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id; 
  const result = await NoticeService.createNoticeDB(req.body, userId);

  sendResponse(res, 201, {
    success: true,
    message: "Notice published successfully",
    data: result,
  });
});

const getNotices = catchAsync(async (req: Request, res: Response) => {
  const role = (req as any).user.role;
  

  const result = await NoticeService.getAllNoticesDB(role, req.query);

  sendResponse(res, 200, {
    success: true,
    message: "Notices fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const NoticeController = {
  createNotice,
  getNotices
};