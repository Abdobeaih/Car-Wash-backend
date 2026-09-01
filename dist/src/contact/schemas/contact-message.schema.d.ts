import { HydratedDocument } from 'mongoose';
export type ContactMessageDocument = HydratedDocument<ContactMessage>;
export declare class ContactMessage {
    name: string;
    email: string;
    message: string;
    read: boolean;
}
export declare const ContactMessageSchema: any;
