import { pool } from "../../../config/db";
import { getDistanceInMeters } from "../../../utils/geoDistance";


// ==========================================
// ১. ডাইনামিক মার্ক অ্যাটেনডেন্স (Check-In)
// ==========================================
export const markAttendance = async (
  employeeId: string,
  lat: number,
  lon: number,
  officeId: number
) => {
  // ১. অফিস লোকেশন, ব্যাসার্ধ, এবং অ্যাডমিনের সেট করা লেট/অ্যাবসেন্ট টাইম রিড করা
  const officeResult = await pool.query(
    "SELECT * FROM offices WHERE id = $1 AND is_active = TRUE",
    [officeId]
  );

  if (officeResult.rows.length === 0) {
    throw new Error("Selected office not found or is currently inactive.");
  }

  const office = officeResult.rows[0];

  // ২. জিপিএস জিওফেন্স (Geofence) রেঞ্জ ভ্যালিডেশন
  const distance = getDistanceInMeters(
    lat,
    lon,
    parseFloat(office.latitude),
    parseFloat(office.longitude)
  );

  if (distance > office.radius_meters) {
    throw new Error(
      `You are ${Math.round(distance)}m away. Allowed range is ${office.radius_meters}m.`
    );
  }

  // ৩. লিভ (Leave Status) ভ্যালিডেশন
  const approvedLeave = await pool.query(
    `SELECT * FROM leave_requests 
     WHERE employee_id = $1 AND status = 'approved' 
     AND CURRENT_DATE BETWEEN start_date AND end_date`,
    [employeeId]
  );
  if (approvedLeave.rows.length > 0) {
    throw new Error("You are officially on leave today.");
  }

  // ৪. ডুপ্লিকেট চেক-ইন ভ্যালিডেশন
  const checkToday = await pool.query(
    "SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE",
    [employeeId]
  );
  if (checkToday.rows.length > 0) {
    throw new Error("Attendance already marked for today.");
  }

  // ৫. নিখুঁত টাইমজোন ক্যালকুলেশন (Asia/Dhaka)
  const now = new Date();
  const currentTime = now.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Dhaka" 
  });

  const timeParts = currentTime.split(":");
  const currentTotalMinutes = Number(timeParts[0] || 0) * 60 + Number(timeParts[1] || 0);

  const officeParts = (office.start_time || "09:00:00").split(":");
  const officeTotalMinutes = Number(officeParts[0] || 0) * 60 + Number(officeParts[1] || 0);

  // 🎯 অ্যাডমিন প্যানেলের ডাইনামিক লিমিট (টেবিলে ডেটা না থাকলে ফলব্যাক ১২০ ও ২৪০ মিনিট)
  const maxLateLimit = office.max_late_minutes ?? 120; 
  const maxAbsentLimit = office.max_absent_minutes ?? 240; 

  let status = "present";

  if (currentTotalMinutes > officeTotalMinutes) {
    const lateMinutes = currentTotalMinutes - officeTotalMinutes;

    if (lateMinutes > maxAbsentLimit) {
      // অ্যাডমিনের সেট করা ম্যাক্স মিনিটের বেশি হলে সরাসরি Absent
      status = "absent";
    } else if (lateMinutes > maxLateLimit) {
      // অ্যাডমিনের সেট করা হাফ-ডে মিনিটের বেশি হলে Half Day
      status = "half_day";
    } else {
      // নির্ধারিত লিমিটের নিচে হলে সাধারণ Late
      status = "late";
    }
  }

  // 📂 ৬. ডাটাবেজে রেকর্ড ইনসার্ট করা
  const result = await pool.query(
    `INSERT INTO attendance (employee_id, office_id, check_in, status) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [employeeId, officeId, currentTime, status]
  );

  return result.rows[0];
};

// ==========================================
// ২. ডাইনামিক চেক-আউট (Check-Out)
// ==========================================
export const checkoutFromDB = async (
  employeeId: string, 
  lat: number, 
  lon: number,
  officeId: number
) => {
  // ১. নির্দিষ্ট অফিসের ইনফো অ্যাডমিন টেবিল থেকে আনা
  const officeResult = await pool.query(
    "SELECT * FROM offices WHERE id = $1 AND is_active = TRUE",
    [officeId]
  );

  if (officeResult.rows.length === 0) {
    throw new Error("Office configuration not found or inactive.");
  }

  const office = officeResult.rows[0];

  // ২. জিofence দূরত্ব চেক
  const distance = getDistanceInMeters(
    lat,
    lon,
    parseFloat(office.latitude),
    parseFloat(office.longitude)
  );

  if (distance > office.radius_meters) {
    throw new Error(
      `Out of range. You are ${Math.round(distance)}m away from ${office.name}.`
    );
  }

  // ৩. আজকের চেক-ইন রেকর্ডটি খুঁজে বের করা
  const attendanceRecord = await pool.query(
    "SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE",
    [employeeId]
  );

  if (attendanceRecord.rows.length === 0) {
    throw new Error("No check-in record found for today. Please check-in first.");
  }

  if (attendanceRecord.rows[0].check_out) {
    throw new Error("You have already checked out for today.");
  }

  // ৪. বাংলাদেশের সঠিক সময়ে চেক-আউট টাইম ফরম্যাট
  const now = new Date();
  const currentTime = now.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Dhaka" 
  });

  // 📂 ৫. ডাটাবেজে আগের রো-টি আপডেট করা (এখানে শুধু check_out আপডেট হবে, স্ট্যাটাস আগেরটাই থাকবে)
  const result = await pool.query(
    `UPDATE attendance 
     SET check_out = $1 
     WHERE employee_id = $2 AND date = CURRENT_DATE 
     RETURNING *`,
    [currentTime, employeeId]
  );

  return result.rows[0];
};


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


const getAllAttendanceForAdminFromDB = async (
  page: number,
  limit: number,
  searchTerm?: string,
  startDate?: string,
  endDate?: string,
) => {
  const offset = (page - 1) * limit;

  // --- 🎯 বাংলাদেশ টাইমজোন অনুযায়ী নিখুঁত কারেন্ট ডেট ক্যালকুলেশন ---
  const bdBundledDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Dhaka", // 'en-CA' ব্যবহার করলে সরাসরি YYYY-MM-DD ফরম্যাটে ডেট পাওয়া যায়
  });

  const [year, month] = bdBundledDate.split("-");
  const firstDayOfMonth = `${year}-${month}-01`; // চলতি মাসের প্রথম দিন (যেমন: 2026-05-01)
  const today = bdBundledDate; // আজকের সঠিক বাংলাদেশি দিন (যেমন: 2026-05-17)

  // যদি ইউজার ফ্রন্টএন্ড থেকে ডেট ফিল্টার না পাঠায়, তবে ডিফল্ট মাসের শুরু থেকে আজ পর্যন্ত দেখাবে
  const start = startDate || firstDayOfMonth;
  const end = endDate || today;

  // soft delete ফিল্টার এবং ডেট ফিল্টার
  let queryParams: any[] = [start, end, limit, offset];
  let filterQuery = `AND u.is_deleted = FALSE`; // শুধুমাত্র একটিভ ইউজারদের ডাটা আসবে

  // 🎯 সার্চ প্যারামিটার পজিশন ডাইনামিক করা (যাতে $5 পজিশন লক হয়ে না থাকে)
  if (searchTerm) {
    queryParams.push(`%${searchTerm}%`);
    const searchParamPosition = queryParams.length; // এটি অটোমেটিক $5 হবে
    filterQuery += ` AND (u.name ILIKE $${searchParamPosition} OR u.email ILIKE $${searchParamPosition} OR a.employee_id::text = $${searchParamPosition})`;
  }

  const dataQuery = `
    SELECT 
      a.*, 
      u.name as employee_name,
      u.email as employee_email,
      o.name as office_name,
      -- চলতি মাসে ওই এমপ্লয়ির মোট লিভ/এবসেন্ট কাউন্ট (এখানেও বাংলাদেশ টাইমজোন সুরক্ষিত রাখা হয়েছে)
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

  // কাউন্ট এবং সামারি কুয়েরির জন্য লিমিট এবং অফসেট বাদে বাকি প্যারামিটার আলাদা করা
  const nonPagingParams = queryParams.slice(0, 2); // শুধুমাত্র start এবং end
  if (searchTerm) {
    nonPagingParams.push(queryParams[4]); // যদি সার্চ থাকে তবে সার্চ টার্মটিও পুশ হবে
  }

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
        COUNT(CASE WHEN status = 'present' THEN 1 END) as total_on_time,
        COUNT(CASE WHEN status = 'half_day' THEN 1 END) as total_half_day, -- 🎯 হাফ ডে পলিসি কাউন্টও যুক্ত করা হলো
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as total_absent
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE a.date >= $1 AND a.date <= $2
    ${filterQuery}
  `;

  // তিনটি কুয়েরি একসাথে প্যারালালি রান করা হচ্ছে
  const [result, totalCount, summaryResult] = await Promise.all([
    pool.query(dataQuery, queryParams),
    pool.query(countQuery, nonPagingParams),
    pool.query(summaryQuery, nonPagingParams),
  ]);

  const total = parseInt(totalCount.rows[0]?.count || "0", 10);

  return {
    meta: {
      page,
      limit,
      totalData: total,
      totalPages: Math.ceil(total / limit),
    },
    summary: summaryResult.rows[0] || { total_records: 0, total_late: 0, total_on_time: 0, total_half_day: 0, total_absent: 0 },
    data: result.rows,
  };
};

export const attendanceService = {
  markAttendance,
  checkoutFromDB,
  getAllAttendanceByEmployeeFromDB,
  getAllAttendanceForAdminFromDB,
};
