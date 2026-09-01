"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notifications_service_1 = require("../notifications/notifications.service");
const contact_message_schema_1 = require("./schemas/contact-message.schema");
let ContactService = class ContactService {
    contactModel;
    notificationsService;
    constructor(contactModel, notificationsService) {
        this.contactModel = contactModel;
        this.notificationsService = notificationsService;
    }
    async create(dto) {
        const created = await this.contactModel.create(dto);
        await this.notificationsService.notifyAdminsOfContactMessage({
            name: dto.name,
            email: dto.email,
            message: dto.message,
            contactId: created._id.toString(),
        });
        return { message: 'Message received. We will get back to you as soon as possible.' };
    }
    async findAll() {
        return this.contactModel.find().sort({ createdAt: -1 }).exec();
    }
    async getUnreadCount() {
        return this.contactModel.countDocuments({ read: false });
    }
    async markAsRead(id) {
        const message = await this.contactModel
            .findByIdAndUpdate(id, { read: true }, { new: true })
            .exec();
        if (!message) {
            throw new common_1.NotFoundException('Message not found.');
        }
        return message;
    }
};
exports.ContactService = ContactService;
exports.ContactService = ContactService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(contact_message_schema_1.ContactMessage.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, notifications_service_1.NotificationsService])
], ContactService);
//# sourceMappingURL=contact.service.js.map