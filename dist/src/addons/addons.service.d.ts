import { Model } from 'mongoose';
import { AddOnDocument } from './schemas/addon.schema';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/addon.dto';
export declare class AddOnsService {
    private readonly addOnModel;
    constructor(addOnModel: Model<AddOnDocument>);
    findAll(): Promise<AddOnDocument[]>;
    findPublic(): Promise<AddOnDocument[]>;
    create(dto: CreateAddOnDto): Promise<AddOnDocument>;
    update(id: string, dto: UpdateAddOnDto): Promise<AddOnDocument>;
    remove(id: string): Promise<void>;
}
