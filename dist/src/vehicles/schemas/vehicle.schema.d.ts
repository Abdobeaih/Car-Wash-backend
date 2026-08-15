import { HydratedDocument } from 'mongoose';
export type VehicleDocument = HydratedDocument<Vehicle>;
export declare enum VehicleType {
    SEDAN = "SEDAN",
    SUV = "SUV",
    PICKUP = "PICKUP",
    LUXURY = "LUXURY"
}
export declare class Vehicle {
    userId: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    vehicleType: VehicleType;
}
export declare const VehicleSchema: import("mongoose").Schema<Vehicle, import("mongoose").Model<Vehicle, any, any, any, any, any, Vehicle>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    userId?: import("mongoose").SchemaDefinitionProperty<string, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    brand?: import("mongoose").SchemaDefinitionProperty<string, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    model?: import("mongoose").SchemaDefinitionProperty<string, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    year?: import("mongoose").SchemaDefinitionProperty<number, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    color?: import("mongoose").SchemaDefinitionProperty<string, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    plateNumber?: import("mongoose").SchemaDefinitionProperty<string, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    vehicleType?: import("mongoose").SchemaDefinitionProperty<VehicleType, Vehicle, import("mongoose").Document<unknown, {}, Vehicle, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Vehicle & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, Vehicle>;
