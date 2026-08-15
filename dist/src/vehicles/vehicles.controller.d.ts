import { RequestUser } from '../common/interfaces/request-user.interface';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
export declare class VehiclesController {
    private readonly vehiclesService;
    constructor(vehiclesService: VehiclesService);
    findAll(user: RequestUser): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/vehicle.schema").Vehicle, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/vehicle.schema").Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    create(user: RequestUser, dto: CreateVehicleDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/vehicle.schema").Vehicle, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/vehicle.schema").Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    findOne(user: RequestUser, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/vehicle.schema").Vehicle, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/vehicle.schema").Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    update(user: RequestUser, id: string, dto: UpdateVehicleDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/vehicle.schema").Vehicle, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/vehicle.schema").Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
    remove(user: RequestUser, id: string): Promise<void>;
}
