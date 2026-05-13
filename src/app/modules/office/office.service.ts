import { pool } from "../../../config/db";
import { IOffice } from "../../../types/office.type";




 const createOfficeService = async (
  officeData: IOffice,
): Promise<IOffice> => {

  const countRes = await pool.query("SELECT COUNT(*) FROM offices");
  const count = parseInt(countRes.rows[0].count);

  if (count > 0) {
    throw new Error(
      "An organization/office already exists. You cannot create multiple.",
    );
  }

  const { name, latitude, longitude, radius_meters, start_time, end_time } =
    officeData;

  const query = `
        INSERT INTO offices (name, latitude, longitude, radius_meters, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;

  const values = [
    name,
    latitude,
    longitude,
    radius_meters || 100,
    start_time,
    end_time,
  ];
  const res = await pool.query(query, values);
  return res.rows[0];
};


 const updateOfficeService = async (
  id: number,
  officeData: Partial<IOffice>,
): Promise<IOffice> => {
  const {
    name,
    latitude,
    longitude,
    radius_meters,
    start_time,
    end_time,
    is_active,
  } = officeData;

  const query = `
        UPDATE offices 
        SET name = COALESCE($1, name), 
            latitude = COALESCE($2, latitude), 
            longitude = COALESCE($3, longitude), 
            radius_meters = COALESCE($4, radius_meters), 
            start_time = COALESCE($5, start_time), 
            end_time = COALESCE($6, end_time),
            is_active = COALESCE($7, is_active)
        WHERE id = $8
        RETURNING *;
    `;

  const values = [
    name,
    latitude,
    longitude,
    radius_meters,
    start_time,
    end_time,
    is_active,
    id,
  ];
  const res = await pool.query(query, values);

  if (res.rowCount === 0) {
    throw new Error("Office not found");
  }
  return res.rows[0];
};


 const getAllOfficesService = async (): Promise<IOffice[]> => {
  const res = await pool.query("SELECT * FROM offices ORDER BY id DESC");
  return res.rows;
};


export const officeServices = {
  createOfficeService,
  updateOfficeService,
  getAllOfficesService
}