import { HydratedDocument } from 'mongoose';
export type ServiceDocument = HydratedDocument<CarService>;
export declare class CarService {
    name: string;
    slug: string;
    description: string;
    image: string;
    basePrice: number;
    duration: number;
    isActive: boolean;
}
export declare const ServiceSchema: any;
