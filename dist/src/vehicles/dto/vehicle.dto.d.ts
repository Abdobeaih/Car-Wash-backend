import { VehicleType } from '../schemas/vehicle.schema';
export declare class CreateVehicleDto {
    brand: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    vehicleType: VehicleType;
}
export declare class UpdateVehicleDto {
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
    plateNumber?: string;
    vehicleType?: VehicleType;
}
