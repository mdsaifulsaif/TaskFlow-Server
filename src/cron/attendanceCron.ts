// import cron from "node-cron";
// import { pool } from "../config/db";

// export const initAttendanceCron = () => {
//   // protidin rat 11:59 a run hobe(59 23 * * *)
//   cron.schedule("59 23 * * *", async () => {
//     const now = new Date().toLocaleString();
//     // console.log(` Attendance Cron Job Started: ${now}`);

//     const today = new Date().toISOString().split("T")[0];

//     try {
//       const query = `
//         INSERT INTO attendance (employee_id, date, status, office_id)
//         SELECT
//             e.id,
//             $1,
//             'absent',
//             COALESCE(e.office_id, 1)
//         FROM employees e
//         JOIN users u ON e.user_id = u.id
//         LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
//         WHERE a.id IS NULL
//         AND u.is_deleted = FALSE
//         AND e.join_date <= $1
//       `;

//       const result = await pool.query(query, [today]);

//       console.log(
//         ` Cron Job Finished: Marked ${result.rowCount} employees as absent for ${today}.`
//       );
//     } catch (error) {
//       console.error(" Cron Job Error:", error);
//     }
//   }, {
//     timezone: "Asia/Dhaka"
//   });

//   console.log(" Cron Job Initialized: Daily Absent Check at 23:59 (Asia/Dhaka)");
// };

// ==========================================================================

// import cron from "node-cron";
// import nodemailer from "nodemailer";
// import { pool } from "../config/db";

// // ১. নোডমেইলার ট্রান্সপোর্টার সেটআপ (.env থেকে আসবে)
// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT),
//   secure: process.env.EMAIL_SECURE === "true", // true for port 465, false for other ports
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// export const initAttendanceCron = () => {
//   // -------------------------------------------------------------
//   // CRON JOB 1: প্রতিদিন রাত ১১:৫৯ এ অনুপস্থিতদের 'absent' মার্ক করা
//   // -------------------------------------------------------------
//   cron.schedule("59 23 * * *", async () => {
//     const today = new Date().toISOString().split("T")[0];

//     try {
//       const query = `
//         INSERT INTO attendance (employee_id, date, status, office_id)
//         SELECT
//             e.id,
//             $1,
//             'absent',
//             COALESCE(e.office_id, 1)
//         FROM employees e
//         JOIN users u ON e.user_id = u.id
//         LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
//         WHERE a.id IS NULL
//         AND u.is_deleted = FALSE
//         AND e.join_date <= $1
//       `;

//       const result = await pool.query(query, [today]);
//       console.log(` Cron Job Finished: Marked ${result.rowCount} employees as absent for ${today}.`);
//     } catch (error) {
//       console.error(" Cron Job Error:", error);
//     }
//   }, {
//     timezone: "Asia/Dhaka"
//   });

//   // -------------------------------------------------------------
//   // 🎯 CRON JOB 2: প্রতিদিন রাত ১২:০০ এ টানা ৩ দিন absent থাকলে অটো-মেইল পাঠানো
//   // -------------------------------------------------------------
//   cron.schedule("0 0 * * *", async () => {
//     console.log("⏰ Checking for 3 consecutive days of absence...");

//     try {
//       // এই কুয়েরিটি গত ৩টি অ্যাটেনডেন্স ডেট চেক করবে যেখানে স্ট্যাটাস 'absent' ছিল
//       const consecutiveQuery = `
//         WITH last_3_attendance_days AS (
//           SELECT DISTINCT date
//           FROM attendance
//           ORDER BY date DESC
//           LIMIT 3
//         ),
//         absent_counts AS (
//           SELECT
//             employee_id,
//             COUNT(*) as absent_days
//           FROM attendance
//           WHERE date IN (SELECT date FROM last_3_attendance_days)
//             AND status = 'absent' -- আপনার ডাটাবেজের স্ট্যাটাস ছোটহাতের 'absent'
//           GROUP BY employee_id
//         )
//         SELECT
//           e.id as employee_id,
//           u.email,
//           u.name
//         FROM absent_counts ac
//         JOIN employees e ON ac.employee_id = e.id
//         JOIN users u ON e.user_id = u.id
//         WHERE ac.absent_days = 3;
//       `;

//       const result = await pool.query(consecutiveQuery);
//       const absentees = result.rows;

//       if (absentees.length === 0) {
//         console.log("✅ No employees found with 3 consecutive absences today.");
//         return;
//       }

//       // লুপ চালিয়ে প্রত্যেক এমপ্লয়িকে ইমেইল পাঠানো
//       for (const employee of absentees) {
//         const mailOptions = {
//           from: `"HR Department" <${process.env.EMAIL_USER}>`,
//           to: employee.email,
//           subject: "Warning: Notification of 3 Consecutive Absences",
//           html: `
//             <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
//               <h2 style="color: #dc2626;">Dear ${employee.name},</h2>
//               <p>This is an automated notification from the HR Department.</p>
//               <p>Our attendance management system shows that you have been marked <b>absent for 3 consecutive working days</b> without any approved leave application.</p>
//               <p>Please contact your line manager or the HR department immediately to update your situation.</p>
//               <br/>
//               <hr style="border: 0; border-top: 1px solid #eee;" />
//               <p style="font-size: 11px; color: #999;">This is a system-generated email. Please do not reply directly to this message.</p>
//             </div>
//           `,
//         };

//         await transporter.sendMail(mailOptions);
//         console.log(`✉️ Consecutive absence alert mail sent to: ${employee.name} (${employee.email})`);
//       }

//     } catch (error) {
//       console.error("❌ Error in Consecutive Absence Mail Cron Job:", error);
//     }
//   }, {
//     timezone: "Asia/Dhaka"
//   });

//   console.log(" Cron Jobs Initialized: 23:59 (Absent Auto-Mark) & 00:00 (3-Day Absence Mail Check)");
// };






import cron from "node-cron";
import nodemailer from "nodemailer";
import { pool } from "../config/db";

const emailTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 2525, // 🎯 আপনার আইএসপি-র ব্লক বাইপাস করার জন্য ২৫২৫ পোর্ট
  secure: false, // ২৫২৫ পোর্টের জন্য এটি সবসময় false হবে
  auth: {
    user: process.env.GMAIL_APP_NAME,
    pass: process.env.GMAIL_APP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // সেলফ-সাইনড সার্টিফিকেট বা ডকার নেটওয়ার্কিং প্রবলেম এড়াতে
  },
});
export default emailTransporter;

export const initAttendanceCron = async () => {
  console.log("🚀 Attendance Cron Job Initialized successfully!");

  // 🕒 ক্রন ১: প্রতিদিন রাত ১১:৫৯ মিনিটে রান হবে এবং অনুপস্থিতদের 'absent' মার্ক করবে
  cron.schedule("59 23 * * *", async () => {
    const today = new Date().toISOString().split("T")[0];
    console.log(`⏳ [Cron 1] Running absent marker for date: ${today}`);
    
    try {
      // 🎯 সুরক্ষার জন্য ডাটাবেজ থেকে যেকোনো ১টি সচল অফিস আইডি খোঁজা হচ্ছে (Foreign key error এড়াতে)
      const officeRes = await pool.query("SELECT id FROM offices LIMIT 1");
      const defaultOfficeId = officeRes.rows.length > 0 ? officeRes.rows[0].id : null;

      if (!defaultOfficeId) {
        console.error("❌ [Cron 1] Error: No office found in 'offices' table. Cannot insert attendance.");
        return;
      }

      const query = `
        INSERT INTO attendance (employee_id, date, status, office_id)
        SELECT e.id, $1, 'absent', COALESCE(e.office_id, $2)
        FROM employees e
        JOIN users u ON e.user_id = u.id
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
        WHERE a.id IS NULL 
          AND u.is_deleted = FALSE 
          AND e.join_date <= $1
      `;
      
      const result = await pool.query(query, [today, defaultOfficeId]);
      console.log(`✅ [Cron 1] Success! Marked ${result.rowCount} employees as absent.`);
    } catch (error) {
      console.error("❌ [Cron 1] Error:", error);
    }
  });

  // 🕒 ক্রন ২: প্রতিদিন রাত ১২:০০ টায় (পরের দিন শুরুতে) রান হবে এবং টানা ৩ দিন absent থাকলে মেইল পাঠাবে
  cron.schedule("0 0 * * *", async () => {
    console.log("⏳ [Cron 2] Checking for consecutive 3 days of absence...");

    try {
      // 🎯 নিখুঁত SQL উইন্ডো ফাংশন লজিক যা শুধুমাত্র "টানা ৩ দিন" অনুপস্থিত থাকলে ফিল্টার করবে
      const consecutiveQuery = `
        WITH ordered_attendance AS (
          SELECT 
            employee_id, 
            date, 
            status,
            date - (ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY date))::int AS grp
          FROM attendance
          WHERE status = 'absent'
        ),
        consecutive_groups AS (
          SELECT 
            employee_id, 
            COUNT(*) as consecutive_days
          FROM ordered_attendance
          GROUP BY employee_id, grp
          HAVING COUNT(*) >= 3
        )
        SELECT DISTINCT e.id as employee_id, u.email, u.name 
        FROM consecutive_groups cg
        JOIN employees e ON cg.employee_id = e.id
        JOIN users u ON e.user_id = u.id
        WHERE u.is_deleted = FALSE;
      `;

      const result = await pool.query(consecutiveQuery);
      const absentees = result.rows;

      if (absentees.length === 0) {
        console.log("ℹ️ [Cron 2] No employees with 3 consecutive absences found today.");
        return;
      }

      for (const employee of absentees) {
        // যদি ইমেইল সেট করা না থাকে তবে স্কিপ করবে
        if (!employee.email) continue;

        const mailOptions = {
          from: `"HR System" <${process.env.GMAIL_APP_NAME}>`, // জিমেইল সিকিউরিটি পলিসির জন্য
          to: employee.email,
          subject: "⚠️ 3 Days Consecutive Absence Warning Notice",
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #dc2626;">Attendance Warning Notice</h2>
              <p>Hello <strong>${employee.name}</strong>,</p>
              <p>Our records indicate that you have been absent from work for <strong>3 consecutive days</strong> without any prior approval.</p>
              <p>Please contact the HR department or your supervisor immediately to clarify your status.</p>
              <br/>
              <p>Best regards,<br/>HR Operations Team</p>
            </div>
          `,
        };

        await emailTransporter.sendMail(mailOptions);
        console.log(`✉️ Warning mail sent successfully to: ${employee.name} (${employee.email})`);
      }
    } catch (error) {
      console.error("❌ [Cron 2] Error:", error);
    }
  });
};