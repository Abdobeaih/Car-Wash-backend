import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
export declare class ContactController {
    private readonly contactService;
    constructor(contactService: ContactService);
    create(dto: CreateContactDto): Promise<{
        message: string;
    }>;
    findAll(): Promise<(import("mongoose").Document<unknown, {}, import("./schemas/contact-message.schema").ContactMessage, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/contact-message.schema").ContactMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    })[]>;
    getUnreadCount(): Promise<number>;
    markAsRead(id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/contact-message.schema").ContactMessage, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/contact-message.schema").ContactMessage & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & {
        id: string;
    }>;
}
