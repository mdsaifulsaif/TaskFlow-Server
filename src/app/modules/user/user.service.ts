import bcrypt from "bcrypt";
import { pool } from "../../../config/db";
import { generateAccessToken, generateRefreshToken } from "../../../utils/jwt";
import { TAuthResponse } from "../../../types/auth.type";

export const registerUser = async (name: string, email: string, password: string) => {
  const hashed = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING *",
    [name, email, hashed]
  );

  return result.rows[0];
};

export const loginUser = async (email: string, password: string): Promise<TAuthResponse> => {
  const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

  if (user.rows.length === 0) {
    throw new Error("User not found");
  }

  const valid = await bcrypt.compare(password, user.rows[0].password);

  if (!valid) {
    throw new Error("Invalid password");
  }

  const payload = {
    id: user.rows[0].id,
    email: user.rows[0].email,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await pool.query(
    "UPDATE users SET refresh_token=$1 WHERE id=$2",
    [refreshToken, user.rows[0].id]
  );

  return { accessToken, refreshToken };
};