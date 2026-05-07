import { pool } from "../../../config/db";


const applyLeaveDB = async (
  employee_id: string,
  leave_type: string,
  start_date: string,
  end_date: string,
  reason: string
) => {
  const result = await pool.query(
    `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status) 
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
    [employee_id, leave_type, start_date, end_date, reason]
  );
  return result.rows[0];
};

const getEmployeeLeavesDB = async (
  employee_id: string, 
  page: number = 1,    // ২ নম্বর আর্গুমেন্ট
  limit: number = 10,  // ৩ নম্বর আর্গুমেন্ট
  startDate?: string,  // ৪ নম্বর আর্গুমেন্ট
  endDate?: string     // ৫ নম্বর আর্গুমেন্ট
) => {
  const offset = (page - 1) * limit;

 
  const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

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
    pool.query(countQuery, [employee_id, start, end])
  ]);

  const totalData = parseInt(totalCount.rows[0].count);
  const totalPages = Math.ceil(totalData / limit);

  return {
    leaves: leaves.rows,
    meta: {
      page,
      limit,
      totalData,
      totalPages
    }
  };
};

export const LeaveService = {
  applyLeaveDB,
  getEmployeeLeavesDB,
};