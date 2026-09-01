import { AddOnsService } from './addons.service';
export declare class AddOnsController {
    private readonly addOnsService;
    constructor(addOnsService: AddOnsService);
    findAll(): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/addon.schema").AddOn, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/addon.schema").AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
}
