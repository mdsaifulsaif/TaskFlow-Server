import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { pool } from "../../../config/db";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";
import { ApiError } from "../../../errors/ApiError";
import { config } from "../../../config";
import { TJwtPayload } from "../../../types/auth.type";

export const registerUser = async (
  name: string,
  email: string,
  password: string,
) => {
  const client = await pool.connect(); // Transaction
  try {
    await client.query("BEGIN"); // Start Transaction

    const hashed = await bcrypt.hash(password, 10);

    // 1. User table a data inserc
    const userResult = await client.query(
      "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email, role",
      [name, email, hashed],
    );

    const userId = userResult.rows[0].id;

    // 2. Employee table update and sbaki data profile update a hobe
    await client.query(
      "INSERT INTO employees (user_id, base_salary) VALUES ($1, $2)",
      [userId, 0], // salary defatult 0
    );

    await client.query("COMMIT"); // all data thik thakle save hobe
    return userResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK"); // vull hole cancle
    throw error;
  } finally {
    client.release();
  }
};




export const loginUser = async (email: string, password: string) => {

  const query = `
    SELECT u.*, e.id as employee_id 
    FROM users u 
    LEFT JOIN employees e ON u.id = e.user_id 
    WHERE u.email = $1
  `;
  
  const result = await pool.query(query, [email]);
  const user = result.rows[0];


  if (!user) {
    throw new ApiError(404, "এই ইমেইল দিয়ে কোনো ইউজার পাওয়া যায়নি।");
  }


  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(401, "ভুল পাসওয়ার্ড, আবার চেষ্টা করুন।");
  }

  
  const jwtPayload: TJwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    employee_id: user.employee_id, 
  };


  const accessToken = generateAccessToken(jwtPayload);
  const refreshToken = generateRefreshToken(jwtPayload);


  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id
    }
  };
};

export const refreshToken = async (token: string) => {
  // token verify kora
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      config.jwt_refresh_secret as string,
    ) as JwtPayload;
  } catch (err) {
    throw new ApiError(401, "Invalid Refresh Token!");
  }

  const { id, email } = decoded;

  // user database a ache kina dekha
  const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
    id,
  ]);
  const user = userResult.rows[0];

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  // new access token crete 
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role }, 
    config.jwt_access_secret as string, 
    { expiresIn: config.jwt_access_expires_in as any }, 
  );

  return {
    accessToken,
  };
};
