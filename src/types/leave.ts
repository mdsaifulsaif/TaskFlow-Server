export interface FilterOptions {
  employeeId?: string | undefined;
  departmentId?: string | undefined;
  status?: 'pending' | 'approved' | 'rejected' | undefined; // leave_status ENUM অনুযায়ী
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number;
  limit?: number;
}