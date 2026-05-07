import { Response } from "express";


type TMeta = {
  page: number;
  limit: number;
  totalData: number;
  totalPages: number;
};

type TResponse<T> = {
  success: boolean;
  message?: string;
  meta?: TMeta; 
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
    meta: data.meta || null, 
    data: data.data,
  });
};