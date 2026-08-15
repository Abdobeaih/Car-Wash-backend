import { Model } from 'mongoose';
import { VehicleDocument } from './schemas/vehicle.schema';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
export declare class VehiclesService {
    private readonly vehicleModel;
    constructor(vehicleModel: Model<VehicleDocument>);
    findAllForUser(userId: string): Promise<VehicleDocument[]>;
    create(userId: string, dto: CreateVehicleDto): Promise<VehicleDocument>;
    findForUser(userId: string, id: string): Promise<VehicleDocument>;
    update(userId: string, id: string, dto: UpdateVehicleDto): Promise<VehicleDocument>;
    remove(userId: string, id: string): Promise<void>;
}
