import { HydratedDocument } from 'mongoose';
export type ContactMessageDocument = HydratedDocument<ContactMessage>;
export declare class ContactMessage {
    name: string;
    email: string;
    message: string;
    read: boolean;
}
export declare const ContactMessageSchema: import("mongoose").Schema<ContactMessage, import("mongoose").Model<ContactMessage, any, any, any, any, any, ContactMessage>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ContactMessage, import("mongoose").Document<unknown, {}, ContactMessage, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<ContactMessage & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & import("mongoose").HydratedDocumentOverrides<{
    id: string;
}>, {
    name?: import("mongoose").SchemaDefinitionProperty<string, ContactMessage, import("mongoose").Document<unknown, {}, ContactMessage, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ContactMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    email?: import("mongoose").SchemaDefinitionProperty<string, ContactMessage, import("mongoose").Document<unknown, {}, ContactMessage, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ContactMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    message?: import("mongoose").SchemaDefinitionProperty<string, ContactMessage, import("mongoose").Document<unknown, {}, ContactMessage, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ContactMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
    read?: import("mongoose").SchemaDefinitionProperty<boolean, ContactMessage, import("mongoose").Document<unknown, {}, ContactMessage, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<ContactMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & import("mongoose").HydratedDocumentOverrides<{
        id: string;
    }>> | undefined;
}, ContactMessage>;
