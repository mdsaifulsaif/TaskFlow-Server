

import { Request, Response } from "express";
import { createNoticeService, getAllNoticesService, getNoticeByIdService } from "./notice.service";


export const createNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, priority, target_audience, created_by, expires_at } = req.body;

    if (!title || !content) {
       res.status(400).json({ success: false, message: "Title and Content are required" });
       return;
    }


    const newNotice = await createNoticeService({
      title,
      content,
      priority,
      target_audience,
      created_by,
      expires_at
    });

    //  ২. সকেটের মাধ্যমে রিয়েল-টাইমে ফ্রন্টএন্ডে ব্রডকাস্ট করা
    const io = req.app.get("io");
    if (io) {
      io.emit("new_notification", {
        id: newNotice.id,
        title: newNotice.title,
        message: `New Notice: ${newNotice.title}`, // ফ্রন্টএন্ড টোস্টের জন্য মেসেজ
        priority: newNotice.priority,
        target_audience: newNotice.target_audience,
        created_at: newNotice.created_at
      });
      console.log(`📢 Socket: Broadcasted new notice ID: ${newNotice.id}`);
    }

    res.status(201).json({
      success: true,
      message: "Notice created and broadcasted successfully",
      data: newNotice
    });
  } catch (error: any) {
    console.error(" Error creating notice:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

export const getNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    // কুয়েরি থেকে ডিফল্ট ভ্যালুসহ প্যারামিটার রিসিভ করা
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const searchTerm = req.query.searchTerm as string;
    const date = req.query.date as string;

    // সার্ভিস কল
    const result = await getAllNoticesService(page, limit, searchTerm, date);

    res.status(200).json({
      success: true,
      meta: result.meta, // আপনার মেটা অবজেক্ট (page, limit, totalData, totalPages)
      data: result.data
    });
  } catch (error: any) {
    console.error(" Error fetching notices:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getNoticeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // সার্ভিস কল করে ডাটা তুলে আনা
    const notice = await getNoticeByIdService(id as string);

    // নোটিশ না পাওয়া গেলে ৪০৪ এরর হ্যান্ডলিং
    if (!notice) {
       res.status(404).json({
        success: false,
        message: "Notice not found or has been deactivated"
      });
       return;
    }

    // সাকসেস রেসপন্স
    res.status(200).json({
      success: true,
      data: notice
    });
  } catch (error: any) {
    console.error(" Error fetching single notice by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};