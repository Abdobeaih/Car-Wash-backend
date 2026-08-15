import { Model } from 'mongoose';
import { ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
export declare class ServicesService {
    private readonly serviceModel;
    constructor(serviceModel: Model<ServiceDocument>);
    findAll(): Promise<ServiceDocument[]>;
    findPublic(): Promise<ServiceDocument[]>;
    findBySlug(slug: string, publicOnly?: boolean): Promise<ServiceDocument>;
    create(dto: CreateServiceDto): Promise<ServiceDocument>;
    update(id: string, dto: UpdateServiceDto): Promise<ServiceDocument>;
    remove(id: string): Promise<void>;
    private slugify;
}
