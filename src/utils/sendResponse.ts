import { Response } from "express";

// মেটা ডেটার জন্য একটি টাইপ ডিফাইন করা
type TMeta = {
  page: number;
  limit: number;
  totalData: number;
  totalPages: number;
};

type TResponse<T> = {
  success: boolean;
  message?: string;
  meta?: TMeta; // এখানে meta যুক্ত করা হলো
  data?: T;
};

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  data: TResponse<T>
) => {
  res.status(statusCode).json({
    success: data.success,
    message: data.message,
    meta: data.meta || null, // যদি meta থাকে তবে দেখাবে, না থাকলে null বা ইগনোর করবে
    data: data.data,
  });
};