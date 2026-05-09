import { pool } from "../../../config/db";
import { ApiError } from "../../../errors/ApiError";

const generateMonthlyPayrollDB = async (month: string) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const employees = await client.query(
      `SELECT id, base_salary FROM employees`,
    );


    const totalDaysInMonth = new Date(
      new Date(month).getFullYear(),
      new Date(month).getMonth() + 1,
      0,
    ).getDate();

    for (const emp of employees.rows) {
      const employeeId = emp.id;
      const baseSalary = parseFloat(emp.base_salary);

     
      const existing = await client.query(
        `SELECT id FROM payroll WHERE employee_id = $1 AND month = $2`,
        [employeeId, month],
      );

      if (existing.rows.length === 0) {
   
        const attendanceSummary = await client.query(
          `SELECT 
             COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
             COUNT(*) FILTER (WHERE status = 'on_leave') as leave_days
           FROM attendance 
           WHERE employee_id = $1 
           AND TO_CHAR(date, 'Month YYYY') = $2`,
          [employeeId, month],
        );

        const absentDays = parseInt(attendanceSummary.rows[0].absent_days || 0);
        const leaveDays = parseInt(attendanceSummary.rows[0].leave_days || 0);

      
        const unpaidDays = absentDays + leaveDays;

     
        const dailySalary = baseSalary / totalDaysInMonth;
        const deduction = dailySalary * unpaidDays;
        const totalPayable = baseSalary - deduction;

        await client.query(
          `INSERT INTO payroll (employee_id, month, bonus, deduction, total_payable, is_paid)
           VALUES ($1, $2, $3, $4, $5, false)`,
          [employeeId, month, 0, deduction.toFixed(2), totalPayable.toFixed(2)],
        );
      }
    }

    await client.query("COMMIT");
    return { message: `${month} মাসের পেরোল সাকসেসফুলি জেনারেট হয়েছে।` };
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
const getAllPayrollDB = async () => {
  const query = `
    SELECT p.*, e.designation, u.name as employee_name
    FROM payroll p
    JOIN employees e ON p.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    ORDER BY p.month DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

export const PayrollService = {
  generateMonthlyPayrollDB,
  markAsPaidDB,
  getAllPayrollDB,
};
