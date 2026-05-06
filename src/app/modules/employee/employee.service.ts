import { config } from "../../../config";
import { pool } from "../../../config/db";
import { ApiError } from "../../../errors/ApiError";
import bcrypt from "bcrypt";

const createEmployeeIntoDB = async (payload: any) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // password has
    const hashedPassword = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds),
    );

    // ২. Users টেবিলে ডাটা ইনসার্ট
    const userInsertQuery = `
      INSERT INTO users (name, email, password, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, role`;

    const newUser = await client.query(userInsertQuery, [
      payload.name,
      payload.email,
      hashedPassword,
      payload.role || "employee",
    ]);

    const userId = newUser.rows[0].id;

    // ৩. Employees টেবিলে ডাটা ইনসার্ট
    const employeeInsertQuery = `
      INSERT INTO employees (user_id, department_id, designation, phone, base_salary) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`;

    const newEmployee = await client.query(employeeInsertQuery, [
      userId,
      payload.department_id,
      payload.designation,
      payload.phone,
      payload.base_salary,
    ]);

    await client.query("COMMIT");

    return {
      user: newUser.rows[0],
      employee: newEmployee.rows[0],
    };
  } catch (error: any) {
    await client.query("ROLLBACK");
    // Duplicate Email চেক
    if (error.code === "23505") {
      throw new ApiError(400, "Email already exists!");
    }
    throw new ApiError(500, error.message || "Failed to create employee");
  } finally {
    client.release();
  }
};

const getAllEmployeeDB = async()=>{

  const query = `
   SELECT e. FROM employees as e left JOIN users as u
  `

  const result = await pool.query(query)
  return result.rows
}

export const EmployeeService = {
  createEmployeeIntoDB,
  getAllEmployeeDB
};
