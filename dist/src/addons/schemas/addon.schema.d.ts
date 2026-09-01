import { HydratedDocument } from 'mongoose';
export type AddOnDocument = HydratedDocument<AddOn>;
export declare class AddOn {
    name: string;
    description: string;
    price: number;
    isActive: boolean;
}
export declare const AddOnSchema: any;
