import { HydratedDocument } from 'mongoose';
export type VehicleDocument = HydratedDocument<Vehicle>;
export declare enum VehicleType {
    SEDAN = "SEDAN",
    SUV = "SUV",
    PICKUP = "PICKUP",
    LUXURY = "LUXURY"
}
export declare class Vehicle {
    userId: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    vehicleType: VehicleType;
}
export declare const VehicleSchema: any;
