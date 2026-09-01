import { RequestUser } from '../common/interfaces/request-user.interface';
import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(user: RequestUser): Promise<{}>;
    getUnreadCount(user: RequestUser): Promise<number>;
    markAllAsRead(user: RequestUser): Promise<{
        modified: number;
    }>;
    markAsRead(user: RequestUser, id: string): Promise<HydratedDocument<import("./schemas/notification.schema").Notification>>;
}
