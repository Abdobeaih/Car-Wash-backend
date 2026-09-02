import { Model } from 'mongoose';
import { AddOnDocument } from './schemas/addon.schema';
export declare class AddOnsService {
    private readonly addOnModel;
    constructor(addOnModel: Model<AddOnDocument>);
    findPublic(): Promise<AddOnDocument[]>;
}
