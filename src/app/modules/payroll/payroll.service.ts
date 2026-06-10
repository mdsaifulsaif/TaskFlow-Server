import { pool } from "../../../config/db";
import { ApiError } from "../../../errors/ApiError";

// const generateMonthlyPayrollDB = async (
//   month: string,
//   defaultBonus: number = 0,
// ) => {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     // ১. সব এমপ্লয়ি নিয়ে আসা
//     const employees = await client.query(
//       `SELECT id, base_salary FROM employees`,
//     );

//     // ২. মাসের মোট দিন সংখ্যা বের করা
//     const totalDaysInMonth = new Date(
//       new Date(month).getFullYear(),
//       new Date(month).getMonth() + 1,
//       0,
//     ).getDate();

//     for (const emp of employees.rows) {
//       const employeeId = emp.id;
//       const baseSalary = parseFloat(emp.base_salary);

//       // ৩. এই মাসের পেরোল অলরেডি জেনারেট করা আছে কিনা চেক
//       const existing = await client.query(
//         `SELECT id FROM payroll WHERE employee_id = $1 AND month = $2`,
//         [employeeId, month],
//       );

//       if (existing.rows.length === 0) {
        
//         // ৪. এই নির্দিষ্ট মাসের সব অ্যাটেনডেন্স রেকর্ড নিয়ে আসা
//         const attendanceRows = await client.query(
//           `SELECT date, status 
//            FROM attendance 
//            WHERE employee_id = $1 
//            AND (TO_CHAR(date, 'FMMonth YYYY') = $2 OR TO_CHAR(date, 'YYYY-MM') = $2)`,
//           [employeeId, month],
//         );

//         let unpaidDays = 0;

//         // ৫. লুপ ঘুরিয়ে প্রতিটি দিনের নিখুঁত হিসাব বের করা
//         for (const row of attendanceRows.rows) {
//           const attendanceDate = row.date;
//           const status = row.status;

//           if (status === 'absent') {
//             unpaidDays += 1;
//           } else if (status === 'half_day') {
//             unpaidDays += 0.5;
//           } else if (status === 'on_leave') {
//             // 🎯 চেক করা হচ্ছে ছুটির আবেদনটি APPROVED কি না
//             const leaveCheck = await client.query(
//               `SELECT status FROM leave_requests 
//                WHERE employee_id = $1 
//                AND $2 >= start_date AND $2 <= end_date`,
//               [employeeId, attendanceDate]
//             );

//             // যদি ছুটির রিকোয়েস্ট না থাকে অথবা স্ট্যাটাস approved না হয় (যেমন pending/rejected)
//             if (leaveCheck.rows.length === 0 || leaveCheck.rows[0].status !== 'approved') {
//               unpaidDays += 1; // আনঅ্যাপ্রুভড ছুটির জন্য ফুল ডে স্যালারি কাটা যাবে
//             }
//           }
//         }

//         // ৬. স্যালারি ও ডিডাকশন ক্যালকুলেশন
//         const dailySalary = baseSalary / totalDaysInMonth;
//         const deduction = dailySalary * unpaidDays;
//         const totalPayable = baseSalary + defaultBonus - deduction;

//         // ৭. ডাটাবেজে ইনসার্ট
//         await client.query(
//           `INSERT INTO payroll (employee_id, month, bonus, deduction, total_payable, is_paid)
//            VALUES ($1, $2, $3, $4, $5, false)`,
//           [
//             employeeId,
//             month,
//             defaultBonus.toFixed(2),
//             deduction.toFixed(2),
//             totalPayable < 0 ? 0 : totalPayable.toFixed(2),
//           ],
//         );
//       }
//     }

//     await client.query("COMMIT");
//     return { message: `${month} মাসের পেরোল সফলভাবে জেনারেট হয়েছে।` };
//   } catch (error: any) {
//     await client.query("ROLLBACK");
//     throw new ApiError(500, error.message);
//   } finally {
//     client.release();
//   }
// };

const generateMonthlyPayrollDB = async (
  month: string,
  bonusType: 'fixed' | 'percentage' = 'fixed', // ডিফল্ট 'fixed'
  bonusValue: number = 0,                        // ডিফল্ট ০ টাকা বা ০%
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ১. সব এমপ্লয়ি নিয়ে আসা
    const employees = await client.query(
      `SELECT id, base_salary FROM employees`,
    );

    // ২. মাসের মোট দিন সংখ্যা বের করা
    const totalDaysInMonth = new Date(
      new Date(month).getFullYear(),
      new Date(month).getMonth() + 1,
      0,
    ).getDate();

    for (const emp of employees.rows) {
      const employeeId = emp.id;
      const baseSalary = parseFloat(emp.base_salary);

      // ৩. এই মাসের পেরোল অলরেডি জেনারেট করা আছে কিনা চেক
      const existing = await client.query(
        `SELECT id FROM payroll WHERE employee_id = $1 AND month = $2`,
        [employeeId, month],
      );

      if (existing.rows.length === 0) {
        
        // ৪. এই নির্দিষ্ট মাসের সব অ্যাটেনডেন্স রেকর্ড নিয়ে আসা
        const attendanceRows = await client.query(
          `SELECT date, status 
           FROM attendance 
           WHERE employee_id = $1 
           AND (TO_CHAR(date, 'FMMonth YYYY') = $2 OR TO_CHAR(date, 'YYYY-MM') = $2)`,
          [employeeId, month],
        );

        let unpaidDays = 0;

        // ৫. লুপ ঘুরিয়ে প্রতিটি দিনের নিখুঁত হিসাব বের করা
        for (const row of attendanceRows.rows) {
          const attendanceDate = row.date;
          const status = row.status;

          if (status === 'absent') {
            unpaidDays += 1;
          } else if (status === 'half_day') {
            unpaidDays += 0.5;
          } else if (status === 'on_leave') {
            // 🎯 চেক করা হচ্ছে ছুটির আবেদনটি APPROVED কি না
            const leaveCheck = await client.query(
              `SELECT status FROM leave_requests 
               WHERE employee_id = $1 
               AND $2 >= start_date AND $2 <= end_date`,
              [employeeId, attendanceDate]
            );

            // যদি ছুটির রিকোয়েস্ট না থাকে অথবা স্ট্যাটাস approved না হয় (যেমন pending/rejected)
            if (leaveCheck.rows.length === 0 || leaveCheck.rows[0].status !== 'approved') {
              unpaidDays += 1; // আনঅ্যাপ্রুভড ছুটির জন্য ফুল ডে স্যালারি কাটা যাবে
            }
          }
        }

        // 🌟 ৬. বোনাস ক্যালকুলেশন লজিক (Fixed vs Percentage)
        let calculatedBonus = 0;
        if (bonusType === 'percentage') {
          // যদি পার্সেন্টেজ হয়, তবে বেসিক স্যালারির সাথে গুণ হবে (যেমন: 50000 * 10 / 100)
          calculatedBonus = (baseSalary * bonusValue) / 100;
        } else {
          // যদি ফিক্সড হয়, তবে সরাসরি ভ্যালু বসে যাবে
          calculatedBonus = bonusValue;
        }

        // ৭. স্যালারি ও ডিডাকশন ক্যালকুলেশন
        const dailySalary = baseSalary / totalDaysInMonth;
        const deduction = dailySalary * unpaidDays;
        const totalPayable = baseSalary + calculatedBonus - deduction;

        // ৮. ডাটাবেজে ইনসার্ট
        await client.query(
          `INSERT INTO payroll (employee_id, month, bonus, deduction, total_payable, is_paid)
           VALUES ($1, $2, $3, $4, $5, false)`,
          [
            employeeId,
            month,
            calculatedBonus.toFixed(2), // ক্যালকুলেট করা বোনাস অ্যামাউন্ট যাবে
            deduction.toFixed(2),
            totalPayable < 0 ? 0 : totalPayable.toFixed(2), // স্যালারি যেন মাইনাসে না যায়
          ],
        );
      }
    }

    await client.query("COMMIT");
    return { message: `${month} মাসের পেরোল সফলভাবে জেনারেট হয়েছে।` };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw new ApiError(500, error.message);
  } finally {
    client.release();
  }
};


const markAsPaidDB = async (payrollId: string) => {
  const query = `
      UPDATE payroll 
      SET is_paid = true, paid_at = CURRENT_TIMESTAMP 
      WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, [payrollId]);
  return result.rows[0];
};

const getAllPayrollDB = async (filters: {
  employeeId?: string;
  month?: string;
  page?: number;
  limit?: number;
}) => {
  const { employeeId, month, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;

  // 🎯 পিক্সড কুয়েরি: ডুপ্লিকেশন এড়াতে স্পষ্ট করে p.id এবং p.employee_id উল্লেখ করা হলো
  let queryText = `
    SELECT 
      p.id as id, 
      p.employee_id as employee_id, 
      p.month as month, 
      p.bonus as bonus, 
      p.deduction as deduction, 
      p.total_payable as total_payable, 
      p.is_paid as is_paid, 
      p.paid_at as paid_at,
      e.designation as designation, 
      u.name as employee_name
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    JOIN users u ON e.user_id = u.id
  `;

  const queryParams: any[] = [];
  let whereClauses: string[] = [];

  if (employeeId) {
    queryParams.push(employeeId);
    whereClauses.push(`p.employee_id = $${queryParams.length}`);
  }

  if (month) {
    queryParams.push(month);
    whereClauses.push(`(p.month = $${queryParams.length} OR TO_CHAR(p.paid_at, 'FMMonth YYYY') = $${queryParams.length})`);
  }

  if (whereClauses.length > 0) {
    queryText += ` WHERE ` + whereClauses.join(" AND ");
  }

  queryText += ` ORDER BY p.month DESC, p.id DESC `;
  
  // কাউন্ট কুয়েরি
  let countQueryText = `
    SELECT COUNT(*) FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    JOIN users u ON e.user_id = u.id
  `;
  if (whereClauses.length > 0) {
    countQueryText += ` WHERE ` + whereClauses.join(" AND ");
  }
  const countResult = await pool.query(countQueryText, queryParams);
  const totalData = parseInt(countResult.rows[0].count);

  queryParams.push(limit);
  queryText += ` LIMIT $${queryParams.length}`;
  
  queryParams.push(offset);
  queryText += ` OFFSET $${queryParams.length}`;

  const result = await pool.query(queryText, queryParams);
  const totalPages = Math.ceil(totalData / limit);

  return {
    meta: {
      page,
      limit,
      totalData,
      totalPages,
    },
    result: result.rows,
  };
};
export const PayrollService = {
  generateMonthlyPayrollDB,
  markAsPaidDB,
  getAllPayrollDB,
};
