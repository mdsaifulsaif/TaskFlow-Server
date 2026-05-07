import { pool } from "../../../config/db";
import { getDistanceInMeters } from "../../../utils/geoDistance";

const OFFICE_LOCATION = { lat: 23.8103, lon: 90.4125 }; // Replace with your actual Office coordinates

const markAttendance = async (employeeId: string, lat: number, lon: number) => {
  // 1. Distance validation
  const distance = getDistanceInMeters(
    lat,
    lon,
    OFFICE_LOCATION.lat,
    OFFICE_LOCATION.lon
  );

  if (distance > 100) {
    throw new Error(
      `Out of range. You are ${Math.round(distance)} meters away from the office.`
    );
  }

  // 2. Check if already checked in today
  const checkToday = await pool.query(
    "SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE",
    [employeeId]
  );

  if (checkToday.rows.length > 0) {
    throw new Error("Attendance already marked for today.");
  }

  // 3. Insert record
  const currentTime = new Date().toLocaleTimeString("en-GB"); // HH:mm:ss
  const result = await pool.query(
    `INSERT INTO attendance (employee_id, check_in, status) 
     VALUES ($1, $2, 'present') RETURNING *`,
    [employeeId, currentTime]
  );

  return result.rows[0];
};

const checkoutFromDB = async (employeeId: string, lat: number, lon: number) => {
  // 1. Distance validation
  const distance = getDistanceInMeters(
    lat,
    lon,
    OFFICE_LOCATION.lat,
    OFFICE_LOCATION.lon
  );

  if (distance > 100) {
    throw new Error(
      `Out of range. You are ${Math.round(distance)} meters away to checkout.`
    );
  }

  // 2. Check if check-in exists and if already checked out
  const attendanceRecord = await pool.query(
    "SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE",
    [employeeId]
  );

  if (attendanceRecord.rows.length === 0) {
    throw new Error("No check-in record found for today.");
  }

  if (attendanceRecord.rows[0].check_out) {
    throw new Error("You have already checked out for today.");
  }

  // 3. Update checkout time
  const currentTime = new Date().toLocaleTimeString("en-GB");
  const result = await pool.query(
    `UPDATE attendance 
     SET check_out = $1 
     WHERE employee_id = $2 AND date = CURRENT_DATE 
     RETURNING *`,
    [currentTime, employeeId]
  );

  return result.rows[0];
};

const getAllAttendanceByEmployeeFromDB = async (employeeId: string, page: number, limit: number) => {
  const offset = (page - 1) * limit;

  // ১. নির্দিষ্ট এমপ্লয়ির ডাটা কুয়েরি করা (লেটেস্ট ডাটা আগে দেখাবে)
  const result = await pool.query(
    `SELECT * FROM attendance 
     WHERE employee_id = $1 
     ORDER BY date DESC 
     LIMIT $2 OFFSET $3`,
    [employeeId, limit, offset]
  );

  // ২. টোটাল কয়টি রেকর্ড আছে তা বের করা (Pagination meta data এর জন্য)
  const totalResult = await pool.query(
    "SELECT COUNT(*) FROM attendance WHERE employee_id = $1",
    [employeeId]
  );
  
  const total = parseInt(totalResult.rows[0].count);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result.rows,
  };
};



export const attendanceService = {
  markAttendance,
  checkoutFromDB,
    getAllAttendanceByEmployeeFromDB,
};