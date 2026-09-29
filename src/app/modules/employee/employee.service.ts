import { config } from "../../../config";
import { pool } from "../../../config/db";
import { ApiError } from "../../../errors/ApiError";
import bcrypt from "bcrypt";

const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.trim());
};

const createEmployeeIntoDB = async (payload: any) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!payload.name || !payload.email || !payload.password) {
      throw new ApiError(400, "Name, email, and password are required!");
    }

    // Role validation & normalization
    const validRoles = ["admin", "hr", "employee"];
    const role =
      payload.role && validRoles.includes(payload.role.toLowerCase())
        ? payload.role.toLowerCase()
        : "employee";

    // Password hashing
    const hashedPassword = await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds),
    );

    // Sanitize department_id:
    // If empty string, undefined, null, or invalid UUID -> set to null
    // If valid UUID -> verify department exists in DB
    let departmentId: string | null = null;
    if (
      payload.department_id &&
      typeof payload.department_id === "string" &&
      payload.department_id.trim() !== ""
    ) {
      const trimmedDeptId = payload.department_id.trim();
      if (isValidUUID(trimmedDeptId)) {
        const deptCheck = await client.query(
          "SELECT id FROM departments WHERE id = $1 AND is_deleted = FALSE",
          [trimmedDeptId],
        );
        if (deptCheck.rows.length > 0) {
          departmentId = trimmedDeptId;
        }
      }
    }

    // Sanitize office_id:
    // If empty string, undefined, null, or invalid integer -> set to null
    // If valid integer -> verify office exists in DB (avoid FK error if offices table is empty)
    let officeId: number | null = null;
    if (
      payload.office_id !== undefined &&
      payload.office_id !== null &&
      String(payload.office_id).trim() !== ""
    ) {
      const parsedOfficeId = parseInt(String(payload.office_id), 10);
      if (!isNaN(parsedOfficeId) && parsedOfficeId > 0) {
        const officeCheck = await client.query(
          "SELECT id FROM offices WHERE id = $1 AND is_deleted = FALSE",
          [parsedOfficeId],
        );
        if (officeCheck.rows.length > 0) {
          officeId = parsedOfficeId;
        }
      }
    }

    const baseSalary =
      payload.base_salary !== undefined && !isNaN(Number(payload.base_salary))
        ? Number(payload.base_salary)
        : 0;

    const designation = payload.designation ? String(payload.designation).trim() : null;
    const phone = payload.phone ? String(payload.phone).trim() : null;

    // 1. Insert into users table
    const userInsertQuery = `
      INSERT INTO users (name, email, password, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, role`;

    const newUser = await client.query(userInsertQuery, [
      payload.name.trim(),
      payload.email.trim().toLowerCase(),
      hashedPassword,
      role,
    ]);

    const userId = newUser.rows[0].id;

    // 2. Insert into employees table
    const employeeInsertQuery = `
      INSERT INTO employees (user_id, department_id, designation, phone, base_salary, office_id) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *`;

    const newEmployee = await client.query(employeeInsertQuery, [
      userId,
      departmentId,
      designation,
      phone,
      baseSalary,
      officeId,
    ]);

    await client.query("COMMIT");

    return {
      user: newUser.rows[0],
      employee: newEmployee.rows[0],
    };
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      throw new ApiError(400, "Email already exists!");
    }
    throw new ApiError(error.statusCode || 500, error.message || "Failed to create employee");
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

  let whereConditions = ["u.is_deleted = FALSE", "e.is_deleted = FALSE"];
  let values: any[] = [];
  let paramIndex = 1;

  if (searchTerm && searchTerm.trim() !== "") {
    whereConditions.push(
      `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR e.designation ILIKE $${paramIndex} OR e.phone ILIKE $${paramIndex})`,
    );
    values.push(`%${searchTerm.trim()}%`);
    paramIndex++;
  }

  // Only apply department_id filter if it's a valid UUID (prevents uuid: "" error)
  if (
    department_id &&
    typeof department_id === "string" &&
    department_id.trim() !== "" &&
    isValidUUID(department_id.trim())
  ) {
    whereConditions.push(`e.department_id = $${paramIndex}`);
    values.push(department_id.trim());
    paramIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

  const query = `
    SELECT 
      e.id,
      e.user_id,
      e.department_id,
      e.office_id,
      u.name,
      u.email,
      u.role,
      d.name AS department_name,
      o.name AS office_name,
      e.designation,
      e.phone,
      e.base_salary,
      e.join_date
    FROM employees e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN offices o ON e.office_id = o.id
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
  if (!isValidUUID(id)) {
    throw new ApiError(400, "Invalid employee ID format!");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check if employee exists
    const empRes = await client.query(
      "SELECT user_id, department_id, office_id FROM employees WHERE id = $1 AND is_deleted = FALSE",
      [id],
    );

    if (empRes.rows.length === 0) {
      throw new ApiError(404, "Employee not found!");
    }

    const currentEmp = empRes.rows[0];
    const userId = currentEmp.user_id;

    // 2. Update user info (name, email, role)
    const validRoles = ["admin", "hr", "employee"];
    const role =
      payload.role && validRoles.includes(payload.role.toLowerCase())
        ? payload.role.toLowerCase()
        : null;

    const userUpdateQuery = `
      UPDATE users 
      SET name = COALESCE($1, name), 
          email = COALESCE($2, email),
          role = COALESCE($3, role)
      WHERE id = $4
      RETURNING id, name, email, role;
    `;
    await client.query(userUpdateQuery, [
      payload.name ? payload.name.trim() : null,
      payload.email ? payload.email.trim().toLowerCase() : null,
      role,
      userId,
    ]);

    // 3. Resolve department_id
    let newDeptId: string | null = currentEmp.department_id;
    if (payload.department_id !== undefined) {
      if (
        !payload.department_id ||
        payload.department_id === "" ||
        payload.department_id === "null"
      ) {
        newDeptId = null;
      } else if (isValidUUID(String(payload.department_id).trim())) {
        const trimmedDept = String(payload.department_id).trim();
        const deptCheck = await client.query(
          "SELECT id FROM departments WHERE id = $1 AND is_deleted = FALSE",
          [trimmedDept],
        );
        newDeptId = deptCheck.rows.length > 0 ? trimmedDept : null;
      } else {
        newDeptId = null;
      }
    }

    // 4. Resolve office_id
    let newOfficeId: number | null = currentEmp.office_id;
    if (payload.office_id !== undefined) {
      if (
        !payload.office_id ||
        payload.office_id === "" ||
        payload.office_id === "null"
      ) {
        newOfficeId = null;
      } else {
        const parsed = parseInt(String(payload.office_id), 10);
        if (!isNaN(parsed) && parsed > 0) {
          const offCheck = await client.query(
            "SELECT id FROM offices WHERE id = $1 AND is_deleted = FALSE",
            [parsed],
          );
          newOfficeId = offCheck.rows.length > 0 ? parsed : null;
        } else {
          newOfficeId = null;
        }
      }
    }

    const designation =
      payload.designation !== undefined
        ? payload.designation ? String(payload.designation).trim() : null
        : null;

    const phone =
      payload.phone !== undefined
        ? payload.phone ? String(payload.phone).trim() : null
        : null;

    const baseSalary =
      payload.base_salary !== undefined && !isNaN(Number(payload.base_salary))
        ? Number(payload.base_salary)
        : null;

    const employeeUpdateQuery = `
      UPDATE employees 
      SET designation = COALESCE($1, designation),
          phone = COALESCE($2, phone),
          base_salary = COALESCE($3, base_salary),
          department_id = $4,
          office_id = $5
      WHERE id = $6
      RETURNING *;
    `;
    const result = await client.query(employeeUpdateQuery, [
      designation,
      phone,
      baseSalary,
      newDeptId,
      newOfficeId,
      id,
    ]);

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error: any) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      throw new ApiError(400, "Email already exists!");
    }
    throw new ApiError(error.statusCode || 500, error.message || "Failed to update employee");
  } finally {
    client.release();
  }
};

const deleteEmployeeFromDB = async (employeeId: string) => {
  if (!isValidUUID(employeeId)) {
    throw new ApiError(400, "Invalid employee ID format!");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const findUserRes = await client.query(
      "SELECT user_id FROM employees WHERE id = $1 AND is_deleted = FALSE",
      [employeeId],
    );

    if (findUserRes.rows.length === 0) {
      throw new ApiError(404, "Employee not found!");
    }

    const userId = findUserRes.rows[0].user_id;

    await client.query("UPDATE employees SET is_deleted = TRUE WHERE id = $1", [
      employeeId,
    ]);
    await client.query("UPDATE users SET is_deleted = TRUE WHERE id = $1", [
      userId,
    ]);

    await client.query("COMMIT");
    return { success: true, message: "Employee deactivated successfully" };
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw new ApiError(error.statusCode || 500, error.message || "Failed to delete employee");
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
