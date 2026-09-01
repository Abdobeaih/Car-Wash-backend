import { RequestUser } from '../common/interfaces/request-user.interface';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
export declare class VehiclesController {
    private readonly vehiclesService;
    constructor(vehiclesService: VehiclesService);
    findAll(user: RequestUser): Promise<{}>;
    create(user: RequestUser, dto: CreateVehicleDto): Promise<HydratedDocument<import("./schemas/vehicle.schema").Vehicle>>;
    findOne(user: RequestUser, id: string): Promise<HydratedDocument<import("./schemas/vehicle.schema").Vehicle>>;
    update(user: RequestUser, id: string, dto: UpdateVehicleDto): Promise<HydratedDocument<import("./schemas/vehicle.schema").Vehicle>>;
    remove(user: RequestUser, id: string): Promise<void>;
}
