export interface IUser {
  id?: number;
  name: string;
  email: string;
  password: string;
  refresh_token?: string;
  created_at?: string;
}