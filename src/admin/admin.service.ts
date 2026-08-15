import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Booking, BookingDocument, BookingStatus } from '../bookings/schemas/booking.schema';
import { CarService, ServiceDocument } from '../services/schemas/service.schema';
import { AddOn, AddOnDocument } from '../addons/schemas/addon.schema';
import { CreateServiceDto, UpdateServiceDto } from '../services/dto/service.dto';
import { CreateAddOnDto, UpdateAddOnDto } from '../addons/dto/addon.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/constants/roles';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(CarService.name) private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(AddOn.name) private readonly addOnModel: Model<AddOnDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboard() {
    const [totalBookings, pending, confirmed, completed, customers, revenueAgg] = await Promise.all(
      [
        this.bookingModel.countDocuments(),
        this.bookingModel.countDocuments({ status: BookingStatus.PENDING }),
        this.bookingModel.countDocuments({ status: BookingStatus.CONFIRMED }),
        this.bookingModel.countDocuments({ status: BookingStatus.COMPLETED }),
        this.userModel.countDocuments({ role: UserRole.CUSTOMER }),
        this.bookingModel.aggregate([
          { $match: { status: { $nin: [BookingStatus.CANCELLED] } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
      ],
    );

    return {
      totalBookings,
      pendingBookings: pending,
      confirmedBookings: confirmed,
      completedBookings: completed,
      customers,
      revenue: revenueAgg.length > 0 ? revenueAgg[0].total : 0,
    };
  }

  async getCalendar(start?: string, end?: string) {
    const query: Record<string, unknown> = {
      status: { $nin: [BookingStatus.CANCELLED] },
    };
    if (start || end) {
      const dateQuery: Record<string, string> = {};
      if (start) dateQuery.$gte = start;
      if (end) dateQuery.$lte = end;
      query.date = dateQuery;
    }
    return this.bookingModel
      .find(query)
      .sort({ date: 1, startTime: 1 })
      .populate('serviceId vehicleId customerId')
      .exec();
  }

  async getServices() {
    return this.serviceModel.find().sort({ createdAt: -1 }).exec();
  }

  async createService(dto: CreateServiceDto) {
    const slug = dto.slug ?? this.slugify(dto.name);
    const created = new this.serviceModel({ ...dto, slug });
    return created.save();
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    const existing = await this.serviceModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Service not found.');
    }
    const patch = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(existing, patch);
    return existing.save();
  }

  async deleteService(id: string): Promise<void> {
    await this.serviceModel.findByIdAndDelete(id).exec();
  }

  async getAddOns() {
    return this.addOnModel.find().sort({ createdAt: -1 }).exec();
  }

  async createAddOn(dto: CreateAddOnDto) {
    const created = new this.addOnModel(dto);
    return created.save();
  }

  async updateAddOn(id: string, dto: UpdateAddOnDto) {
    const existing = await this.addOnModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Add-on not found.');
    }
    const patch = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(existing, patch);
    return existing.save();
  }

  async deleteAddOn(id: string): Promise<void> {
    await this.addOnModel.findByIdAndDelete(id).exec();
  }

  async getBookings(status?: string, search?: string) {
    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    let ids: Types.ObjectId[] = [];
    if (search) {
      const regex = new RegExp(search, 'i');
      const users = await this.userModel
        .find({ $or: [{ name: regex }, { email: regex }] }, { _id: 1 })
        .exec();
      ids = users.map((u) => u._id as Types.ObjectId);
      if (ids.length > 0) query.customerId = { $in: ids };
      else query._id = new Types.ObjectId(); // no matches
    }

    return this.bookingModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('customerId vehicleId serviceId addOnIds services.serviceId services.addOnIds')
      .exec();
  }

  async getBooking(id: string) {
    const booking = await this.bookingModel
      .findById(id)
      .populate('customerId vehicleId serviceId addOnIds services.serviceId services.addOnIds')
      .exec();
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    return booking;
  }

  async updateBookingStatus(id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.bookingModel.findById(id).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    const previousStatus = booking.status;
    booking.status = dto.status;
    const saved = await booking.save();
    const populated = await this.bookingModel.populate(saved, [
      { path: 'customerId' },
      { path: 'vehicleId' },
      { path: 'serviceId' },
      { path: 'addOnIds' },
    ]);

    if (previousStatus !== dto.status) {
      await this.notificationsService.createBookingStatusNotification(
        booking.customerId,
        populated,
        dto.status,
      );
    }

    return populated;
  }

  async getCustomers(search?: string) {
    const query: Record<string, unknown> = { role: UserRole.CUSTOMER };
    if (search) {
      const regex = { $regex: search, $options: 'i' } as unknown;
      query.$or = [{ name: regex }, { email: regex }];
    }

    const customers = await this.userModel.find(query).sort({ createdAt: -1 }).lean().exec();

    return Promise.all(
      customers.map(async (c) => {
        const bookingCount = await this.bookingModel.countDocuments({
          customerId: c._id.toString(),
        });
        return {
          _id: c._id.toString(),
          name: c.name,
          email: c.email,
          role: c.role,
          bookingCount,
          createdAt: c.createdAt,
        };
      }),
    );
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
