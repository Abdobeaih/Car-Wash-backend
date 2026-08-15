import { Model } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactMessageDocument } from './schemas/contact-message.schema';
export declare class ContactService {
    private readonly contactModel;
    private readonly notificationsService;
    constructor(contactModel: Model<ContactMessageDocument>, notificationsService: NotificationsService);
    create(dto: CreateContactDto): Promise<{
        message: string;
    }>;
    findAll(): Promise<ContactMessageDocument[]>;
    getUnreadCount(): Promise<number>;
    markAsRead(id: string): Promise<ContactMessageDocument>;
}
