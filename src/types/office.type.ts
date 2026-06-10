export interface IOffice {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters?: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
  max_late_minutes?: number;   
  max_absent_minutes?: number; 
}