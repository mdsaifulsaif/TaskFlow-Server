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

const getAllDepartmentDB = async (page: number, limit: number) => {
  try {
    const offset = (page - 1) * limit;

    
    const dataQuery = `
      SELECT * FROM departments 
      ORDER BY name ASC 
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) FROM departments`;

    const [result, totalCount] = await Promise.all([
      pool.query(dataQuery, [limit, offset]),
      pool.query(countQuery)
    ]);

    const total = parseInt(totalCount.rows[0].count);

    return {
      meta: {
        page,
        limit,
        totalData: total,
        totalPages: Math.ceil(total / limit),
      },
      data: result.rows,
    };
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to fetch departments");
  }
};

export const DepartmentService = {
  createDepartmentDB,
  getAllDepartmentDB,
};
