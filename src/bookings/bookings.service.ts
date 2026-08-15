import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { CarService } from '../services/schemas/service.schema';
import { AddOn } from '../addons/schemas/addon.schema';
import { Booking, BookingDocument, BookingStatus } from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { workingStartMinutes, workingEndMinutes } from './working-hours.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<Vehicle>,
    @InjectModel(CarService.name) private readonly serviceModel: Model<CarService>,
    @InjectModel(AddOn.name) private readonly addOnModel: Model<AddOn>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(customerId: string, dto: CreateBookingDto): Promise<BookingDocument> {
    const vehicle = await this.vehicleModel
      .findOne({ _id: dto.vehicleId, userId: customerId })
      .exec();
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found or does not belong to you.');
    }

    const serviceIds = dto.services.map((s) => s.serviceId);
    const services = await this.serviceModel.find({ _id: { $in: serviceIds } }).exec();
    if (services.length !== serviceIds.length) {
      throw new BadRequestException('One or more services do not exist.');
    }
    const inactiveService = services.find((s) => !s.isActive);
    if (inactiveService) {
      throw new BadRequestException(`Service "${inactiveService.name}" is not available.`);
    }
    const serviceById = new Map(services.map((s) => [s._id.toString(), s]));

    const addOnIds = dto.services.flatMap((s) => s.addOnIds);
    const addOns = await this.addOnModel.find({ _id: { $in: addOnIds } }).exec();
    if (addOns.length !== new Set(addOnIds).size) {
      throw new BadRequestException('One or more add-ons do not exist.');
    }
    const inactiveAddOn = addOns.find((a) => !a.isActive);
    if (inactiveAddOn) {
      throw new BadRequestException(`Add-on "${inactiveAddOn.name}" is not available.`);
    }
    const addOnById = new Map(addOns.map((a) => [a._id.toString(), a]));

    const items = dto.services.map((selection) => {
      const svc = serviceById.get(selection.serviceId)!;
      const addOnCost = selection.addOnIds.reduce(
        (sum, id) => sum + (addOnById.get(id)?.price ?? 0),
        0,
      );
      return {
        serviceId: selection.serviceId,
        addOnIds: selection.addOnIds,
        duration: svc.duration,
        subtotal: svc.basePrice,
        total: svc.basePrice + addOnCost,
      };
    });

    const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

    this.validateDate(dto.date);
    this.validateTimeWithinWorkingHours(dto.startTime, totalDuration);

    const endTime = this.computeEndTime(dto.startTime, totalDuration);
    if (this.timeToMinutes(endTime) > workingEndMinutes()) {
      throw new BadRequestException('The requested time is outside working hours.');
    }

    const conflicts = await this.bookingModel
      .findOne({
        date: dto.date,
        status: { $ne: BookingStatus.CANCELLED },
        $or: [{ startTime: { $lt: endTime }, endTime: { $gt: dto.startTime } }],
      })
      .exec();

    if (conflicts) {
      throw new ConflictException('This time slot is no longer available.');
    }

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const first = items[0];

    const created = new this.bookingModel({
      customerId,
      vehicleId: dto.vehicleId,
      serviceId: first.serviceId,
      addOnIds: first.addOnIds,
      services: items.map(({ serviceId, addOnIds, duration, subtotal }) => ({
        serviceId,
        addOnIds,
        duration,
        subtotal,
      })),
      date: dto.date,
      startTime: dto.startTime,
      endTime,
      duration: totalDuration,
      subtotal,
      total,
      status: BookingStatus.PENDING,
      paymentStatus: 'PENDING',
      location: dto.location,
    });

    const saved = await created.save();
    const populated = await this.populateBooking(saved);
    await this.notificationsService.notifyAdminsOfNewBooking(populated);
    return populated;
  }

  async findAllForCustomer(customerId: string): Promise<BookingDocument[]> {
    return this.bookingModel
      .find({ customerId })
      .sort({ createdAt: -1 })
      .populate('vehicleId serviceId addOnIds services.serviceId services.addOnIds')
      .exec();
  }

  async findForCustomer(customerId: string, id: string): Promise<BookingDocument> {
    const booking = await this.bookingModel
      .findOne({ _id: id, customerId })
      .populate('vehicleId serviceId addOnIds services.serviceId services.addOnIds')
      .exec();
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    return booking;
  }

  async cancelForCustomer(customerId: string, id: string): Promise<BookingDocument> {
    const booking = await this.bookingModel.findOne({ _id: id, customerId }).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }
    if (booking.status === BookingStatus.COMPLETED) {
      throw new ForbiddenException('Completed bookings cannot be cancelled.');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('This booking is already cancelled.');
    }
    booking.status = BookingStatus.CANCELLED;
    const saved = await booking.save();
    const populated = await this.populateBooking(saved);
    await this.notificationsService.notifyAdminsOfCancellation(populated);
    return populated;
  }

  private validateDate(date: string): void {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date.');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed.getTime() < today.getTime()) {
      throw new BadRequestException('Booking date cannot be in the past.');
    }
  }

  private validateTimeWithinWorkingHours(startTime: string, duration: number): void {
    if (!/^\d{2}:\d{2}$/.test(startTime)) {
      throw new BadRequestException('Invalid start time.');
    }
    const [h, m] = startTime.split(':').map(Number);
    if (h < 9 || h > 17 || (h === 17 && m > 0)) {
      throw new BadRequestException('Time must be within working hours (09:00 - 18:00).');
    }
    const start = this.timeToMinutes(startTime);
    if (start < workingStartMinutes() || start + duration > workingEndMinutes()) {
      throw new BadRequestException('Time must be within working hours (09:00 - 18:00).');
    }
  }

  private computeEndTime(startTime: string, duration: number): string {
    const start = this.timeToMinutes(startTime);
    const end = start + duration;
    const h = Math.floor(end / 60);
    const m = end % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private async populateBooking(booking: BookingDocument): Promise<BookingDocument> {
    return this.bookingModel.populate(booking, [
      { path: 'vehicleId' },
      { path: 'serviceId' },
      { path: 'addOnIds' },
      { path: 'services.serviceId' },
      { path: 'services.addOnIds' },
    ]);
  }
}
