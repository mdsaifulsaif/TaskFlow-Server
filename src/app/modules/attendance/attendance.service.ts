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
    "SELECT * FROM offices WHERE is_active = TRUE LIMIT 1"
  );

  if (officeResult.rows.length === 0) {
    throw new Error("Office configuration not found.");
  }

  const office = officeResult.rows[0];

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
  endDate?: string
) => {
  const offset = (page - 1) * limit;
  const defaultStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = new Date().toISOString().split('T')[0];

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

export const attendanceService = {
  markAttendance,
  checkoutFromDB,
  getAllAttendanceByEmployeeFromDB,
};




