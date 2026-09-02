import { Model } from 'mongoose';
import { ServiceDocument } from './schemas/service.schema';
export declare class ServicesService {
    private readonly serviceModel;
    constructor(serviceModel: Model<ServiceDocument>);
    findPublic(): Promise<ServiceDocument[]>;
    findBySlug(slug: string, publicOnly?: boolean): Promise<ServiceDocument>;
}
