import cron from "node-cron";
import { pool } from "../config/db";

export const initAttendanceCron = () => {
  // protidin rat 11:59 a run hobe(59 23 * * *)
  cron.schedule("59 23 * * *", async () => {
    const now = new Date().toLocaleString();
    // console.log(` Attendance Cron Job Started: ${now}`);

    const today = new Date().toISOString().split("T")[0];

    try {
      const query = `
        INSERT INTO attendance (employee_id, date, status, office_id)
        SELECT 
            e.id, 
            $1, 
            'absent',
            COALESCE(e.office_id, 1)
        FROM employees e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
        WHERE a.id IS NULL 
        AND u.is_deleted = FALSE
        AND e.join_date <= $1
      `;

      const result = await pool.query(query, [today]);

      console.log(
        ` Cron Job Finished: Marked ${result.rowCount} employees as absent for ${today}.`
      );
    } catch (error) {
      console.error(" Cron Job Error:", error);
    }
  }, {
    timezone: "Asia/Dhaka" 
  });

  console.log(" Cron Job Initialized: Daily Absent Check at 23:59 (Asia/Dhaka)");
};