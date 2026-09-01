import { ServicesService } from './services.service';
export declare class ServicesController {
    private readonly servicesService;
    constructor(servicesService: ServicesService);
    findAll(): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    findBySlug(slug: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/service.schema").CarService, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/service.schema").CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
}
