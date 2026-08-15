import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactMessage, ContactMessageDocument } from './schemas/contact-message.schema';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(ContactMessage.name)
    private readonly contactModel: Model<ContactMessageDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateContactDto): Promise<{ message: string }> {
    const created = await this.contactModel.create(dto);

    await this.notificationsService.notifyAdminsOfContactMessage({
      name: dto.name,
      email: dto.email,
      message: dto.message,
      contactId: created._id.toString(),
    });

    return { message: 'Message received. We will get back to you as soon as possible.' };
  }

  async findAll(): Promise<ContactMessageDocument[]> {
    return this.contactModel.find().sort({ createdAt: -1 }).exec();
  }

  async getUnreadCount(): Promise<number> {
    return this.contactModel.countDocuments({ read: false });
  }

  async markAsRead(id: string): Promise<ContactMessageDocument> {
    const message = await this.contactModel
      .findByIdAndUpdate(id, { read: true }, { new: true })
      .exec();
    if (!message) {
      throw new NotFoundException('Message not found.');
    }
    return message;
  }
}
