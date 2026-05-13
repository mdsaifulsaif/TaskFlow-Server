import { pool } from "../../../config/db";
import { getDistanceInMeters } from "../../../utils/geoDistance";

const markAttendance = async (
  employeeId: string,
  lat: number,
  lon: number,
  officeId: number, // Frontend will send this ID
) => {
  const officeResult = await pool.query(
    "SELECT * FROM offices WHERE id = $1 AND is_active = TRUE",
    [officeId],
  );

  if (officeResult.rows.length === 0) {
    throw new Error("Selected office not found or is currently inactive.");
  }

  const office = officeResult.rows[0];

  const distance = getDistanceInMeters(
    lat,
    lon,
    parseFloat(office.latitude),
    parseFloat(office.longitude),
  );

  if (distance > office.radius_meters) {
    throw new Error(
      `You are ${Math.round(distance)}m away. Range is ${office.radius_meters}m.`,
    );
  }

  const approvedLeave = await pool.query(
    `SELECT * FROM leave_requests 
     WHERE employee_id = $1 AND status = 'approved' 
     AND CURRENT_DATE BETWEEN start_date AND end_date`,
    [employeeId],
  );
  if (approvedLeave.rows.length > 0)
    throw new Error("You are officially on leave today.");

  const checkToday = await pool.query(
    "SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE",
    [employeeId],
  );
  if (checkToday.rows.length > 0)
    throw new Error("Attendance already marked for today.");

  const now = new Date();
  const currentTime = now.toLocaleTimeString("en-GB"); // format: HH:mm:ss

  const [hours, minutes, seconds] = office.start_time.split(":");
  const threshold = new Date();
  threshold.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));

  const status = now > threshold ? "late" : "present";

  const result = await pool.query(
    `INSERT INTO attendance (employee_id, office_id, check_in, status) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [employeeId, officeId, currentTime, status],
  );

  return result.rows[0];
};

const checkoutFromDB = async (employeeId: string, lat: number, lon: number) => {
  const officeResult = await pool.query(
    "SELECT * FROM offices WHERE is_active = TRUE LIMIT 1",
  );

  if (officeResult.rows.length === 0) {
    throw new Error("Office configuration not found.");
  }

  const office = officeResult.rows[0];

  const distance = getDistanceInMeters(
    lat,
    lon,
    parseFloat(office.latitude),
    parseFloat(office.longitude),
  );

  if (distance > office.radius_meters) {
    throw new Error(
      `Out of range. You are ${Math.round(distance)}m away from ${office.name}.`,
    );
  }

  const attendanceRecord = await pool.query(
    "SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE",
    [employeeId],
  );

  if (attendanceRecord.rows.length === 0) {
    throw new Error("No check-in record found for today.");
  }

  if (attendanceRecord.rows[0].check_out) {
    throw new Error("You have already checked out for today.");
  }

  const currentTime = new Date().toLocaleTimeString("en-GB");
  const result = await pool.query(
    `UPDATE attendance 
     SET check_out = $1 
     WHERE employee_id = $2 AND date = CURRENT_DATE 
     RETURNING *`,
    [currentTime, employeeId],
  );

  return result.rows[0];
};

// attendance.service.ts

const getAllAttendanceByEmployeeFromDB = async (
  employeeId: string,
  page: number,
  limit: number,
  startDate?: string,
  endDate?: string,
) => {
  const offset = (page - 1) * limit;
  const defaultStartDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];
  const defaultEndDate = new Date().toISOString().split("T")[0];

  const start = startDate || defaultStartDate;
  const end = endDate || defaultEndDate;
  const result = await pool.query(
    `SELECT * FROM attendance 
     WHERE employee_id = $1 
     AND date >= $2 AND date <= $3 
     ORDER BY date DESC LIMIT $4 OFFSET $5`,
    [employeeId, start, end, limit, offset],
  );

  const totalResult = await pool.query(
    `SELECT COUNT(*) FROM attendance 
     WHERE employee_id = $1 
     AND date >= $2 AND date <= $3`,
    [employeeId, start, end],
  );

  const total = parseInt(totalResult.rows[0].count);

  return {
    meta: {
      page: page,
      limit: limit,
      totalData: total,
      totalPages: Math.ceil(total / limit),
    },
    data: result.rows,
  };
};

// const getAllAttendanceForAdminFromDB = async (
//   page: number,
//   limit: number,
//   searchTerm?: string,
//   startDate?: string,
//   endDate?: string,
// ) => {
//   const offset = (page - 1) * limit;

//   const today = new Date().toISOString().split("T")[0];
//   const start = startDate || today;
//   const end = endDate || today;

//   let queryParams: any[] = [start, end, limit, offset];
//   let filterQuery = "";

//   if (searchTerm) {
//     filterQuery = `AND (u.name ILIKE $5 OR u.email ILIKE $5 OR a.employee_id::text = $5)`;
//     queryParams.push(`%${searchTerm}%`);
//   }

//   const dataQuery = `
//     SELECT
//       a.*,
//       u.name as employee_name,  -- users টেবিল থেকে নাম আসছে
//       u.email as employee_email, -- users টেবিল থেকে ইমেইল আসছে
//       o.name as office_name
//     FROM attendance a
//     JOIN employees e ON a.employee_id = e.id
//     JOIN users u ON e.user_id = u.id -- এখানে users টেবিল জয়েন করা হয়েছে
//     JOIN offices o ON a.office_id = o.id
//     WHERE a.date >= $1 AND a.date <= $2
//     ${filterQuery}
//     ORDER BY a.date DESC, a.check_in DESC
//     LIMIT $3 OFFSET $4
//   `;

//   const countQuery = `
//     SELECT COUNT(*)
//     FROM attendance a
//     JOIN employees e ON a.employee_id = e.id
//     JOIN users u ON e.user_id = u.id -- কাউন্টেও জয়েন প্রয়োজন
//     WHERE a.date >= $1 AND a.date <= $2
//     ${filterQuery}
//   `;

//   const summaryQuery = `
//     SELECT
//         COUNT(*) as total_records,
//         COUNT(CASE WHEN status = 'late' THEN 1 END) as total_late,
//         COUNT(CASE WHEN status = 'present' THEN 1 END) as total_on_time
//     FROM attendance a
//     JOIN employees e ON a.employee_id = e.id
//     JOIN users u ON e.user_id = u.id
//     WHERE a.date >= $1 AND a.date <= $2
//     ${filterQuery}
//   `;

//   //   const [result, totalCount] = await Promise.all([
//   //     pool.query(dataQuery, queryParams),
//   //     pool.query(countQuery, queryParams.slice(0, queryParams.length - 2))
//   //   ]);

//   const [result, totalCount, summaryResult] = await Promise.all([
//     pool.query(dataQuery, queryParams),
//     pool.query(countQuery, queryParams.slice(0, queryParams.length - 2)),
//     pool.query(summaryQuery, queryParams.slice(0, queryParams.length - 2)),
//   ]);

//   const total = parseInt(totalCount.rows[0].count);

//   return {
//     meta: {
//       page,
//       limit,
//       totalData: total,
//       totalPages: Math.ceil(total / limit),
//     },
//     summary: summaryResult.rows[0],
//     data: result.rows,
//   };
// };

const getAllAttendanceForAdminFromDB = async (
  page: number,
  limit: number,
  searchTerm?: string,
  startDate?: string,
  endDate?: string,
) => {
  const offset = (page - 1) * limit;

  // --- কারেন্ট মান্থ ক্যালকুলেশন ---
  const now = new Date();
  // চলতি মাসের প্রথম দিন (যেমন: 2026-05-01)
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  // আজকের দিন (যেমন: 2026-05-13)
  const today = now.toISOString().split("T")[0];

  // যদি ইউজার ডেট না পাঠায়, তবে ডিফল্ট মাসের শুরু থেকে আজ পর্যন্ত দেখাবে
  const start = startDate || firstDayOfMonth;
  const end = endDate || today;

  // soft delete ফিল্টার এবং ডেট ফিল্টার
  let queryParams: any[] = [start, end, limit, offset];
  let filterQuery = `AND u.is_deleted = FALSE`; // শুধুমাত্র একটিভ ইউজারদের ডাটা আসবে

  if (searchTerm) {
    filterQuery += ` AND (u.name ILIKE $5 OR u.email ILIKE $5 OR a.employee_id::text = $5)`;
    queryParams.push(`%${searchTerm}%`);
  }

  // const dataQuery = `
  //   SELECT
  //     a.*,
  //     u.name as employee_name,
  //     u.email as employee_email,
  //     o.name as office_name
  //   FROM attendance a
  //   JOIN employees e ON a.employee_id = e.id
  //   JOIN users u ON e.user_id = u.id
  //   JOIN offices o ON a.office_id = o.id
  //   WHERE a.date >= $1 AND a.date <= $2
  //   ${filterQuery}
  //   ORDER BY a.date DESC, a.check_in DESC
  //   LIMIT $3 OFFSET $4
  // `;

  const dataQuery = `
    SELECT 
      a.*, 
      u.name as employee_name,
      u.email as employee_email,
      o.name as office_name,
      -- চলতি মাসে ওই এমপ্লয়ির মোট লিভ/এবসেন্ট কাউন্ট
      (
        SELECT COUNT(*) 
        FROM attendance att
        WHERE att.employee_id = a.employee_id 
        AND att.status IN ('on_leave', 'absent')
        AND date_trunc('month', att.date) = date_trunc('month', CURRENT_DATE)
      ) as total_leave_days
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    JOIN offices o ON a.office_id = o.id
    WHERE a.date >= $1 AND a.date <= $2
    ${filterQuery}
    ORDER BY a.date DESC, a.check_in DESC
    LIMIT $3 OFFSET $4
  `;

  const countQuery = `
    SELECT COUNT(*) 
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE a.date >= $1 AND a.date <= $2
    ${filterQuery}
  `;

  const summaryQuery = `
    SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as total_late,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as total_on_time
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE a.date >= $1 AND a.date <= $2
    ${filterQuery}
  `;

  const [result, totalCount, summaryResult] = await Promise.all([
    pool.query(dataQuery, queryParams),
    pool.query(countQuery, queryParams.slice(0, queryParams.length - 2)),
    pool.query(summaryQuery, queryParams.slice(0, queryParams.length - 2)),
  ]);

  const total = parseInt(totalCount.rows[0].count);

  return {
    meta: {
      page,
      limit,
      totalData: total,
      totalPages: Math.ceil(total / limit),
    },
    summary: summaryResult.rows[0],
    data: result.rows,
  };
};

export const attendanceService = {
  markAttendance,
  checkoutFromDB,
  getAllAttendanceByEmployeeFromDB,
  getAllAttendanceForAdminFromDB,
};
