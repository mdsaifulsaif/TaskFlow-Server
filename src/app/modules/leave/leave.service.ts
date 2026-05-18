import { pool } from "../../../config/db";
import { ApiError } from "../../../errors/ApiError";
import { FilterOptions } from "../../../types/leave";


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
  page: number = 1,
  limit: number = 10,
  startDate?: string,
  endDate?: string,
  status?: string, // 🎯 ৬ নম্বর আর্গুমেন্ট হিসেবে রিসিভ করা হলো
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

  // 🛠️ ডাইনামিক কুয়েরি এবং প্যারামিটার অ্যারে তৈরি
  let queryArgs = [employee_id, start, end];
  let statusCondition = "";

  // যদি স্ট্যাটাস পাঠানো হয় (যেমন: pending, approved, rejected)
  if (status) {
    queryArgs.push(status);
    statusCondition = `AND status = $4`; // ৪ নম্বর পজিশনে স্ট্যাটাস বসবে
  }

  // LIMIT এবং OFFSET এর পজিশন ডাইনামিক করা
  const limitIdx = queryArgs.length + 1;
  const offsetIdx = queryArgs.length + 2;

  const dataQuery = `
    SELECT * FROM leave_requests 
    WHERE employee_id = $1 
    AND start_date >= $2 AND start_date <= $3
    ${statusCondition}
    ORDER BY applied_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const countQuery = `
    SELECT COUNT(*) FROM leave_requests 
    WHERE employee_id = $1 
    AND start_date >= $2 AND start_date <= $3
    ${statusCondition}
  `;

  // কুয়েরি এক্সিকিউট করার জন্য প্যারামিটার লিস্ট সাজানো
  const dataArgs = [...queryArgs, limit, offset];
  const countArgs = [...queryArgs];

  const [leaves, totalCount] = await Promise.all([
    pool.query(dataQuery, dataArgs),
    pool.query(countQuery, countArgs),
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

const getActiveEmployeeLeavesDB = async (filters: FilterOptions = {}) => {
  const {
    employeeId,
    departmentId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = filters;

  const offset = (page - 1) * limit;

  // ১. ডাইনামিক WHERE কন্ডিশন (শুধুমাত্র একটিভ কর্মচারীদের লিভ রিকোয়েস্ট আসবে)
  let queryConditions = [`u.is_active = true`];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (employeeId) {
    queryConditions.push(`e.id = $${paramIndex++}`);
    queryParams.push(employeeId);
  }

  if (departmentId) {
    queryConditions.push(`e.department_id = $${paramIndex++}`);
    queryParams.push(departmentId);
  }

  if (status) {
    queryConditions.push(`lr.status = $${paramIndex++}`);
    queryParams.push(status);
  }

  if (startDate) {
    queryConditions.push(`lr.start_date >= $${paramIndex++}`);
    queryParams.push(startDate);
  }

  if (endDate) {
    queryConditions.push(`lr.end_date <= $${paramIndex++}`);
    queryParams.push(endDate);
  }

  const whereClause = `WHERE ${queryConditions.join(' AND ')}`;

  // ২. ডাটা তুলে আনার মূল কুয়েরি (leave_requests টেবিল থেকে)
  const dataQuery = `
    SELECT 
      lr.id AS leave_id,
      lr.leave_type,
      lr.start_date,
      lr.end_date,
      lr.reason,
      lr.status AS leave_status,
      lr.applied_at,
      e.id AS employee_id,
      u.name AS employee_name,
      d.name AS department_name
    FROM leave_requests lr
    INNER JOIN employees e ON lr.employee_id = e.id
    INNER JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    ${whereClause}
    ORDER BY lr.applied_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

 
  const countQuery = `
    SELECT COUNT(*) 
    FROM leave_requests lr
    INNER JOIN employees e ON lr.employee_id = e.id
    INNER JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    ${whereClause}
  `;

 
  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, [...queryParams, limit, offset]),
    pool.query(countQuery, queryParams),
  ]);

  const totalData = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalData / limit);

  return {
    leaves: dataResult.rows,
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
getActiveEmployeeLeavesDB 
};
