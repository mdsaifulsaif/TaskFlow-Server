export type TJwtPayload = {
  id: string; 
  email: string;
  role: 'admin' | 'hr' | 'employee'; 
  employee_id?: string | null; 
};

export type TAuthResponse = {
  accessToken: string;
  refreshToken: string;
};