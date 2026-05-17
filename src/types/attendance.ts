interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    employee_id: string; 
  };
}