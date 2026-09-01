import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
export declare class ContactController {
    private readonly contactService;
    constructor(contactService: ContactService);
    create(dto: CreateContactDto): Promise<{
        message: string;
    }>;
    findAll(): Promise<{}>;
    getUnreadCount(): Promise<number>;
    markAsRead(id: string): Promise<HydratedDocument<import("./schemas/contact-message.schema").ContactMessage>>;
}
