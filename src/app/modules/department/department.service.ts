import { pool } from "../../../config/db";
import { ApiError } from "../../../errors/ApiError";
const createDepartmentDB = async (payload: { name: string }) => {
  if (!payload.name) {
    throw new ApiError(400, "Department name is required!");
  }

  try {
    const query = `
      INSERT INTO departments (name) 
      VALUES ($1) 
      RETURNING *
    `;

    const result = await pool.query(query, [payload.name]);

    return result.rows[0];
  } catch (error: any) {
    if (error.code === "23505") {
      throw new ApiError(400, "Department already exists!");
    }
    throw new ApiError(500, error.message || "Failed to create department");
  }
};

export const DepartmentService = {
  createDepartmentDB,
};
