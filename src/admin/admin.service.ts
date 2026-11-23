import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { analyticsMoney, analyticsRange } from './analytics.util';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(CarService.name) private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(AddOn.name) private readonly addOnModel: Model<AddOnDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboard() {
    const [counts, customers] = await Promise.all([
      this.bookingModel.aggregate([
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            pendingBookings: {
              $sum: { $cond: [{ $eq: ['$status', BookingStatus.PENDING] }, 1, 0] },
            },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ['$status', BookingStatus.CONFIRMED] }, 1, 0] },
            },
            completedBookings: {
              $sum: { $cond: [{ $eq: ['$status', BookingStatus.COMPLETED] }, 1, 0] },
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ['$status', BookingStatus.CANCELLED] }, 1, 0] },
            },
            revenue: { $sum: analyticsMoney.recordedPaid },
            bookedValue: { $sum: analyticsMoney.bookedValue },
            outstanding: { $sum: analyticsMoney.outstanding },
          },
        },
      ]),
      this.userModel.countDocuments({ role: UserRole.CUSTOMER }),
    ]);
    return {
      totalBookings: 0,
      pendingBookings: 0,
      confirmedBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      revenue: 0,
      bookedValue: 0,
      outstanding: 0,
      ...counts[0],
      _id: undefined,
      customers,
    };
  }

  async getAnalytics(start?: string, end?: string) {
    const range = analyticsRange(start, end);
    const moneyGroup = Object.fromEntries(
      Object.entries(analyticsMoney).map(([key, value]) => [key, { $sum: value }]),
    );
    const [result] = await this.bookingModel.aggregate([
      { $match: { date: { $gte: range.start, $lte: range.end } } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                bookings: { $sum: 1 },
                ...moneyGroup,
                completed: {
                  $sum: { $cond: [{ $eq: ['$status', BookingStatus.COMPLETED] }, 1, 0] },
                },
                cancelled: {
                  $sum: { $cond: [{ $eq: ['$status', BookingStatus.CANCELLED] }, 1, 0] },
                },
              },
            },
          ],
          daily: [
            { $group: { _id: '$date', bookings: { $sum: 1 }, ...moneyGroup } },
            { $sort: { _id: 1 } },
          ],
          statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          services: [
            { $match: { status: { $ne: BookingStatus.CANCELLED } } },
            {
              $project: {
                items: {
                  $cond: [
                    { $gt: [{ $size: { $ifNull: ['$services', []] } }, 0] },
                    '$services',
                    [{ serviceId: '$serviceId', subtotal: '$subtotal' }],
                  ],
                },
              },
            },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.serviceId',
                count: { $sum: 1 },
                baseValue: { $sum: '$items.subtotal' },
              },
            },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: this.serviceModel.collection.name,
                localField: '_id',
                foreignField: '_id',
                as: 'catalog',
              },
            },
            {
              $project: {
                _id: 1,
                count: 1,
                baseValue: 1,
                name: { $ifNull: [{ $arrayElemAt: ['$catalog.name', 0] }, 'Archived service'] },
              },
            },
          ],
          customers: [
            { $match: { status: { $ne: BookingStatus.CANCELLED } } },
            { $group: { _id: '$customerId', count: { $sum: 1 } } },
            {
              $group: {
                _id: null,
                unique: { $sum: 1 },
                returning: { $sum: { $cond: [{ $gt: ['$count', 1] }, 1, 0] } },
              },
            },
          ],
        },
      },
    ]);
    return {
      range,
      summary: {
        bookings: 0,
        completed: 0,
        cancelled: 0,
        bookedValue: 0,
        completedValue: 0,
        recordedPaid: 0,
        outstanding: 0,
        cancelledPaid: 0,
        ...result?.summary?.[0],
        _id: undefined,
      },
      daily: result?.daily ?? [],
      statuses: result?.statuses ?? [],
      services: result?.services ?? [],
      customers: { unique: 0, returning: 0, ...result?.customers?.[0], _id: undefined },
    };
  }

  async recordPayment(id: string, dto: RecordPaymentDto, recordedBy: string) {
    const booking = await this.bookingModel.findById(id).exec();
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.paymentStatus === dto.paymentStatus) return this.getBooking(id);
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(
        'Cancelled bookings need separate refund reconciliation; payment records cannot be changed here.',
      );
    }
    const updated = await this.bookingModel
      .findOneAndUpdate(
        { _id: id, paymentStatus: booking.paymentStatus, status: { $ne: BookingStatus.CANCELLED } },
        {
          $set: { paymentStatus: dto.paymentStatus },
          $push: {
            paymentHistory: {
              status: dto.paymentStatus,
              recordedBy,
              recordedAt: new Date(),
              reference: dto.reference?.trim(),
            },
          },
        },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!updated)
      throw new ConflictException('This booking changed. Refresh before recording payment.');
    return this.getBooking(id);
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
    const slug = dto.slug ?? slugify(dto.name);
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
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const users = await this.userModel
        .find({ $or: [{ name: regex }, { email: regex }] }, { _id: 1 })
        .exec();
      ids = users.map((u) => u._id as Types.ObjectId);
      if (ids.length > 0) query.customerId = { $in: ids };
      else query._id = { $in: [] }; // no matches
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
      .select('+paymentHistory')
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
      { path: 'services.serviceId' },
      { path: 'services.addOnIds' },
    ]);

    if (previousStatus !== dto.status) {
      try {
        await this.notificationsService.createBookingStatusNotification(
          booking.customerId,
          populated,
          dto.status,
        );
      } catch (err) {
        this.logger.warn('Failed to create booking status notification', err as Error);
      }
    }

    return populated;
  }

  async getCustomers(search?: string) {
    const query: Record<string, unknown> = { role: UserRole.CUSTOMER };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escaped, $options: 'i' } as unknown;
      query.$or = [{ name: regex }, { email: regex }];
    }

    const customers = await this.userModel.find(query).sort({ createdAt: -1 }).lean().exec();

    // Single aggregation replaces the N+1 countDocuments-per-customer pattern.
    const counts = await this.bookingModel
      .aggregate<{ _id: string; count: number }>([
        { $match: { customerId: { $in: customers.map((c) => c._id) } } },
        { $group: { _id: '$customerId', count: { $sum: 1 } } },
      ])
      .exec();
    const countByCustomer = new Map(counts.map((c) => [c._id.toString(), c.count]));

    return customers.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      email: c.email,
      role: c.role,
      bookingCount: countByCustomer.get(c._id.toString()) ?? 0,
      createdAt: c.createdAt,
    }));
  }
}
