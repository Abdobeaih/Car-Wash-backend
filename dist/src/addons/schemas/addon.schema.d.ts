import { HydratedDocument } from 'mongoose';
export type AddOnDocument = HydratedDocument<AddOn>;
export declare class AddOn {
    name: string;
    description: string;
    price: number;
    isActive: boolean;
}
export declare const AddOnSchema: import("mongoose").Schema<AddOn, import("mongoose").Model<AddOn, any, any, any, any, any, AddOn>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AddOn, import("mongoose").Document<unknown, {}, AddOn, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<AddOn & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    name?: import("mongoose").SchemaDefinitionProperty<string, AddOn, import("mongoose").Document<unknown, {}, AddOn, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, AddOn, import("mongoose").Document<unknown, {}, AddOn, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    price?: import("mongoose").SchemaDefinitionProperty<number, AddOn, import("mongoose").Document<unknown, {}, AddOn, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, AddOn, import("mongoose").Document<unknown, {}, AddOn, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<AddOn & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, AddOn>;
