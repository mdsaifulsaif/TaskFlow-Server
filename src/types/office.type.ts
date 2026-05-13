export interface IOffice {
    id?: number;
    name: string;
    latitude: number;
    longitude: number;
    radius_meters?: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
}