import { Request, Response } from "express";
import { PayrollService } from "./payroll.service";
import { catchAsync } from "../../../utils/catchAsync";
import { sendResponse } from "../../../utils/sendResponse";

// const generatePayroll = catchAsync(async (req: Request, res: Response) => {
//   const { month, bonus } = req.body; // 🎯 বডি থেকে বোনাস নেওয়া হচ্ছে (ঐচ্ছিক)
  
//   // বোনাস না পাঠালে ডিফল্ট ০ ধরে নেবে
//   const bonusAmount = bonus ? parseFloat(bonus) : 0; 

//   const result = await PayrollService.generateMonthlyPayrollDB(month, bonusAmount);

//   sendResponse(res, 201, {
//     success: true,
//     message: result.message,
//     data: result,
//   });
// });

// paySalary এবং getAllPayrolls আগের মতোই থাকবে...

const generatePayroll = catchAsync(async (req: Request, res: Response) => {
  // 🎯 রিকোয়েস্ট বডি থেকে month, bonusType এবং bonusValue নেওয়া হচ্ছে
  const { month, bonusType, bonusValue } = req.body; 
  
  // ফ্রন্টএন্ড বা পোস্টম্যান থেকে বোনাস না পাঠালে ডিফল্ট টাইপ 'fixed' এবং ভ্যালু 0 ধরে নেবে
  const typeOfBonus = bonusType ? bonusType : 'fixed';
  const valueOfBonus = bonusValue ? parseFloat(bonusValue) : 0; 

  // আপডেটেড সার্ভিস ফাংশনে ৩টি প্যারামিটার পাস করা হলো
  const result = await PayrollService.generateMonthlyPayrollDB(month, typeOfBonus, valueOfBonus);

  sendResponse(res, 201, {
    success: true,
    message: result.message,
    data: result,
  });
});

const paySalary = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PayrollService.markAsPaidDB(id as string);

  sendResponse(res, 200, {
    success: true,
    message: "Salary payment successful",
    data: result,
  });
});

const getAllPayrolls = catchAsync(async (req: Request, res: Response) => {
  // কুয়েরি থেকে ফিল্টার এবং পেজিনেশন ডেটা নেওয়া হচ্ছে
  const { employeeId, month, page, limit } = req.query;

  const filters = {
    employeeId: employeeId as string,
    month: month as string,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 10,
  };

  const { meta, result } = await PayrollService.getAllPayrollDB(filters);

  // তোমার অন্যান্য রেসপন্সের মতো মেটাডাটা স্ট্রাকচার মেইনটেইন করা হলো
  sendResponse(res, 200, {
    success: true,
    message: "Payrolls fetched successfully",
    meta: meta, 
    data: result,
  });
});
export const PayrollController = {
  generatePayroll,
  paySalary,
  getAllPayrolls
};