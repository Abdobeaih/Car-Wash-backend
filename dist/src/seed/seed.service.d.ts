import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { ServiceDocument } from '../services/schemas/service.schema';
import { AddOnDocument } from '../addons/schemas/addon.schema';
export declare class SeedService implements OnApplicationBootstrap {
    private readonly userModel;
    private readonly serviceModel;
    private readonly addOnModel;
    private readonly configService;
    private readonly logger;
    constructor(userModel: Model<UserDocument>, serviceModel: Model<ServiceDocument>, addOnModel: Model<AddOnDocument>, configService: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    private seedServices;
    private seedAddOns;
    private seedUsers;
}
