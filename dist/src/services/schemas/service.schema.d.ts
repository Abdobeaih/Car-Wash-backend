import { HydratedDocument } from 'mongoose';
export type ServiceDocument = HydratedDocument<CarService>;
export declare class CarService {
    name: string;
    slug: string;
    description: string;
    image: string;
    basePrice: number;
    duration: number;
    isActive: boolean;
}
export declare const ServiceSchema: import("mongoose").Schema<CarService, import("mongoose").Model<CarService, any, any, any, any, any, CarService>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CarService, import("mongoose").Document<unknown, {}, CarService, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    name?: import("mongoose").SchemaDefinitionProperty<string, CarService, import("mongoose").Document<unknown, {}, CarService, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    slug?: import("mongoose").SchemaDefinitionProperty<string, CarService, import("mongoose").Document<unknown, {}, CarService, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    description?: import("mongoose").SchemaDefinitionProperty<string, CarService, import("mongoose").Document<unknown, {}, CarService, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    image?: import("mongoose").SchemaDefinitionProperty<string, CarService, import("mongoose").Document<unknown, {}, CarService, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    basePrice?: import("mongoose").SchemaDefinitionProperty<number, CarService, import("mongoose").Document<unknown, {}, CarService, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    duration?: import("mongoose").SchemaDefinitionProperty<number, CarService, import("mongoose").Document<unknown, {}, CarService, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, CarService, import("mongoose").Document<unknown, {}, CarService, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CarService & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, CarService>;
