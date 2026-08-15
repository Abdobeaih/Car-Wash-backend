export declare class CreateServiceDto {
    name: string;
    slug?: string;
    description: string;
    image: string;
    basePrice: number;
    duration: number;
    isActive?: boolean;
}
export declare class UpdateServiceDto {
    name?: string;
    slug?: string;
    description?: string;
    image?: string;
    basePrice?: number;
    duration?: number;
    isActive?: boolean;
}
