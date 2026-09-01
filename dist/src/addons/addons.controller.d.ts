import { AddOnsService } from './addons.service';
export declare class AddOnsController {
    private readonly addOnsService;
    constructor(addOnsService: AddOnsService);
    findAll(): Promise<{}>;
}
