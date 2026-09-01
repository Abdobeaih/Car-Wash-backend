import { ServicesService } from './services.service';
export declare class ServicesController {
    private readonly servicesService;
    constructor(servicesService: ServicesService);
    findAll(): Promise<{}>;
    findBySlug(slug: string): Promise<HydratedDocument<import("./schemas/service.schema").CarService>>;
}
