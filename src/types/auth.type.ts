export type TJwtPayload = {
  id: number;
  email: string;
};

export type TAuthResponse = {
  accessToken: string;
  refreshToken: string;
};