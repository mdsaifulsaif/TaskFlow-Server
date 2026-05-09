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

    // user table a data insert
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

    //  Employees table a data insert
    const employeeInsertQuery = `
      INSERT INTO employees (user_id, department_id, designation, phone, base_salary, office_id) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`;

    const newEmployee = await client.query(employeeInsertQuery, [
      userId,
      payload.department_id,
      payload.designation,
      payload.phone,
      payload.base_salary,
      payload.office_id
    ]);

    await client.query("COMMIT");

    return {
      user: newUser.rows[0],
      employee: newEmployee.rows[0],
    };
  } catch (error: any) {
    await client.query("ROLLBACK");
    // Duplicate Email চ
    if (error.code === "23505") {
      throw new ApiError(400, "Email already exists!");
    }
    throw new ApiError(500, error.message || "Failed to create employee");
  } finally {
    client.release();
  }
};


const getAllEmployeeDB = async (page: number, limit: number) => {
  const offset = (page - 1) * limit;


  const query = `
    SELECT 
      e.id,
      u.name,
      u.email,
      u.role,
      d.name AS department_name,
      e.designation,
      e.phone,
      e.base_salary,
      e.join_date
    FROM employees e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY e.created_at DESC
    LIMIT $1 OFFSET $2;
  `;

 
  const countQuery = `SELECT COUNT(*) FROM employees`;


  const [result, countResult] = await Promise.all([
    pool.query(query, [limit, offset]), // $1 = limit, $2 = offset
    pool.query(countQuery)
  ]);

  const totalData = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalData / limit);

  return {
    meta: {
      page,
      limit,
      totalData,
      totalPages
    },
    data: result.rows
  };
};

export const EmployeeService = {
  createEmployeeIntoDB,
  getAllEmployeeDB,
};
