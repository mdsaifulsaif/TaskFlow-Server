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
      payload.office_id,
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

const getAllEmployeeDB = async (
  page: number,
  limit: number,
  searchTerm?: string,
  department_id?: string,
) => {
  const offset = (page - 1) * limit;


  let whereConditions = ["u.is_deleted = FALSE"];
  let values = [];


  let paramIndex = 1;

  if (searchTerm) {
    whereConditions.push(
      `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR e.designation ILIKE $${paramIndex})`,
    );
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  if (department_id) {
    whereConditions.push(`e.department_id = $${paramIndex}`);
    values.push(department_id);
    paramIndex++;
  }


  const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

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
    ${whereClause}
    ORDER BY e.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
`;

  const countQuery = `
    SELECT COUNT(*) 
    FROM employees e 
    JOIN users u ON e.user_id = u.id 
    ${whereClause}
  `;
  const queryValues = [...values, limit, offset];

  const [result, countResult] = await Promise.all([
    pool.query(query, queryValues),
    pool.query(countQuery, values),
  ]);

  const totalData = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalData / limit);

  return {
    meta: { page, limit, totalData, totalPages },
    data: result.rows,
  };
};

const updateEmployeeInDB = async (id: string, payload: any) => {
  const { name, email, designation, phone, base_salary, department_id } =
    payload;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userUpdateQuery = `
      UPDATE users 
      SET name = COALESCE($1, name), 
          email = COALESCE($2, email)
      WHERE id = (SELECT user_id FROM employees WHERE id = $3)
      RETURNING id;
    `;
    await client.query(userUpdateQuery, [name, email, id]);

    const employeeUpdateQuery = `
      UPDATE employees 
      SET designation = COALESCE($1, designation),
          phone = COALESCE($2, phone),
          base_salary = COALESCE($3, base_salary),
          department_id = COALESCE($4, department_id)
      WHERE id = $5
      RETURNING *;
    `;
    const result = await client.query(employeeUpdateQuery, [
      designation,
      phone,
      base_salary,
      department_id,
      id,
    ]);

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteEmployeeFromDB = async (employeeId: string) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

  
    const findUserRes = await client.query(
      "SELECT user_id FROM employees WHERE id = $1",
      [employeeId],
    );

    if (findUserRes.rows.length === 0) {
      throw new Error("Employee not found");
    }

    const userId = findUserRes.rows[0].user_id;


    await client.query("UPDATE users SET is_deleted = TRUE WHERE id = $1", [
      userId,
    ]);

    await client.query("COMMIT");
    return { success: true, message: "Employee deactivated successfully" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const EmployeeService = {
  createEmployeeIntoDB,
  getAllEmployeeDB,
  updateEmployeeInDB,
  deleteEmployeeFromDB,
};
