import { pool } from "../../../config/db";
import { ApiError } from "../../../errors/ApiError";

const applyLeaveDB = async (
  employee_id: string,
  leave_type: string,
  start_date: string,
  end_date: string,
  reason: string,
) => {
  // 1. Check if an application already exists for this start date
  const existingLeave = await pool.query(
    `SELECT * FROM leave_requests WHERE employee_id = $1 AND start_date = $2`,
    [employee_id, start_date],
  );

  if (existingLeave.rows.length > 0) {
    throw new ApiError(400, "You have already applied for leave on this date.");
  }

  // 2. Insert query (Default status is 'pending')
  const query = `
    INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await pool.query(query, [
    employee_id,
    leave_type,
    start_date,
    end_date,
    reason,
  ]);
  return result.rows[0];
};


// const approveLeaveDB = async (leaveId: string, status: string) => {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     // ১. ছুটি আপডেট করা (leave_requests table)
//     const updateQuery = `UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *;`;
//     const leaveResult = await client.query(updateQuery, [status, leaveId]);
//     const leave = leaveResult.rows[0];

//     if (!leave) throw new ApiError(404, "Leave request not found");

//     // ২. অ্যাপ্রুভ হলে অ্যাটেনডেন্স টেবিলে ডাটা পাঠানো
//     if (status === 'approved') {
//       // এমপ্লয়ি টেবিল থেকে তার অফিস আইডি খুঁজে বের করা
//       const employeeQuery = `SELECT office_id FROM employees WHERE id = $1`;
//       const empResult = await client.query(employeeQuery, [leave.employee_id]);
//       const officeId = empResult.rows[0]?.office_id;

//       // এখন অ্যাটেনডেন্স টেবিলে office_id সহ ইনসার্ট করা
//       const attendanceQuery = `
//         INSERT INTO attendance (employee_id, office_id, date, status)
//         VALUES ($1, $2, $3, 'on_leave')
//         ON CONFLICT (employee_id, date) 
//         DO UPDATE SET status = 'on_leave', office_id = EXCLUDED.office_id;
//       `;
      
//       await client.query(attendanceQuery, [leave.employee_id, officeId, leave.start_date]);
//     }

//     await client.query('COMMIT');
//     return leave;
//   } catch (error) {
//     await client.query('ROLLBACK');
//     throw error;
//   } finally {
//     client.release();
//   }
// };

const approveLeaveDB = async (leaveId: string, status: string) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ১. লিভ রিকোয়েস্ট আপডেট করা
    const updateResult = await client.query(
      "UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *",
      [status, leaveId]
    );
    const leaveRequest = updateResult.rows[0];

    // ২. যদি স্ট্যাটাস 'approved' হয়, তবে অ্যাটেনডেন্স টেবিলে ডাটা ঢুকানো
    if (status === 'approved') {
      const { employee_id, start_date, end_date } = leaveRequest;
      
      // শুরুর তারিখ থেকে শেষ তারিখ পর্যন্ত লুপ চালিয়ে প্রতিটা দিনের জন্য রো তৈরি
      let currentDate = new Date(start_date);
      const lastDate = new Date(end_date);

      while (currentDate <= lastDate) {
        const dateString = currentDate.toISOString().split('T')[0];

        // অ্যাটেনডেন্স টেবিলে 'on_leave' হিসেবে ইনসার্ট (Conflict হলে ignore করবে)
        await client.query(
          `INSERT INTO attendance (employee_id, date, status) 
           VALUES ($1, $2, 'on_leave')
           ON CONFLICT (employee_id, date) DO NOTHING`,
          [employee_id, dateString]
        );

        // একদিন যোগ করা
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    await client.query('COMMIT');
    return leaveRequest;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getEmployeeLeavesDB = async (
  employee_id: string,
  page: number = 1, // ২ নম্বর আর্গুমেন্ট
  limit: number = 10, // ৩ নম্বর আর্গুমেন্ট
  startDate?: string, // ৪ নম্বর আর্গুমেন্ট
  endDate?: string, // ৫ নম্বর আর্গুমেন্ট
) => {
  const offset = (page - 1) * limit;

  const start =
    startDate ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0];
  const end =
    endDate ||
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

  const dataQuery = `
    SELECT * FROM leave_requests 
    WHERE employee_id = $1 
    AND start_date >= $2 AND start_date <= $3
    ORDER BY applied_at DESC
    LIMIT $4 OFFSET $5
  `;

  const countQuery = `
    SELECT COUNT(*) FROM leave_requests 
    WHERE employee_id = $1 
    AND start_date >= $2 AND start_date <= $3
  `;

  const [leaves, totalCount] = await Promise.all([
    pool.query(dataQuery, [employee_id, start, end, limit, offset]),
    pool.query(countQuery, [employee_id, start, end]),
  ]);

  const totalData = parseInt(totalCount.rows[0].count);
  const totalPages = Math.ceil(totalData / limit);

  return {
    leaves: leaves.rows,
    meta: {
      page,
      limit,
      totalData,
      totalPages,
    },
  };
};

export const LeaveService = {
  applyLeaveDB,
  getEmployeeLeavesDB,
  approveLeaveDB,
};
