declare class LocationDto {
    country: string;
    city: string;
    address: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
}
declare class ServiceSelectionDto {
    serviceId: string;
    addOnIds: string[];
}
export declare class CreateBookingDto {
    vehicleId: string;
    services: ServiceSelectionDto[];
    date: string;
    startTime: string;
    location: LocationDto;
}
export {};
