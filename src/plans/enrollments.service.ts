import { User, UserDocument } from '../users/schemas/user.schema';
import { UserRole } from '../common/constants/roles';
import type { ClientSession } from 'mongoose';
import { createHash } from 'node:crypto';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from '../notifications/schemas/notification.schema';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Enrollment, EnrollmentDocument } from './enrollment.schema';
import { Vehicle } from '../vehicles/schemas/vehicle.schema';
import { CarService } from '../services/schemas/service.schema';
import { Booking, BookingDocument, BookingStatus } from '../bookings/schemas/booking.schema';
import { BookingsService } from '../bookings/bookings.service';
import { ActivateEnrollmentDto, RedeemVisitDto } from './enrollments.dto';
import { PLAN_CATALOG, PLAN_TERMS_VERSION, cairoAppointment, periodEnd } from './terms';
@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Enrollment.name) private readonly enrollments: Model<EnrollmentDocument>,
    @InjectModel(Vehicle.name) private readonly vehicles: Model<Vehicle>,
    @InjectModel(CarService.name) private readonly services: Model<CarService>,
    @InjectModel(Booking.name) private readonly bookings: Model<BookingDocument>,
    private readonly bookingService: BookingsService,
    @InjectModel(Notification.name) private readonly notifications: Model<NotificationDocument>,
  ) {}
  async activate(dto: ActivateEnrollmentDto, adminId: string) {
    await this.requireIndexes();
    const existing = await this.enrollments.findOne({ activationKey: dto.activationKey }).exec();
    if (existing) {
      if (
        existing.customerId.toString() !== dto.customerId ||
        existing.vehicleId.toString() !== dto.vehicleId ||
        existing.planCode !== dto.planCode
      )
        throw new ConflictException('Activation key was already used.');
      return existing;
    }
    if (!(await this.vehicles.exists({ _id: dto.vehicleId, userId: dto.customerId })))
      throw new NotFoundException('Vehicle not found for customer.');
    const plan = PLAN_CATALOG[dto.planCode];
    const catalog = await this.services
      .find({ slug: { $in: Object.keys(plan.allowances) }, isActive: true })
      .exec();
    if (catalog.length !== Object.keys(plan.allowances).length)
      throw new BadRequestException('Included services are unavailable.');
    const startsAt = new Date();
    await this.enrollments.init();
    try {
      return await this.enrollments.create({
        ...dto,
        startsAt,
        endsAt: periodEnd(startsAt),
        termsVersion: PLAN_TERMS_VERSION,
        terms: {
          periodDays: 30,
          timeZone: 'Africa/Cairo',
          endsAtFinalCalendarDay: true,
          rollover: false,
          renewal: 'MANUAL_ADMIN',
          partialRefund: false,
          cancelAtPeriodEnd: true,
          rescheduleHours: 24,
          restoreCancellationHours: 24,
          reminderDays: 3,
          allowances: { ...plan.allowances },
        },
        name: plan.name,
        nameAr: plan.nameAr,
        price: plan.price,
        currency: 'EGP',
        remaining: { ...plan.allowances },
        serviceIds: Object.fromEntries(catalog.map((s) => [s.slug, s._id.toString()])),
        activatedBy: adminId,
        status: 'ACTIVE',
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
        const replay = await this.enrollments.findOne({ activationKey: dto.activationKey }).exec();
        if (
          replay &&
          replay.customerId.toString() === dto.customerId &&
          replay.vehicleId.toString() === dto.vehicleId &&
          replay.planCode === dto.planCode
        )
          return replay;
        throw new ConflictException('Activation key was already used.');
      }
      throw error;
    }
  }
  customerVehicles(customerId: string) {
    return this.vehicles
      .find({ userId: customerId })
      .select('brand model plateNumber vehicleType year color')
      .exec();
  }
  async revenueSummary() {
    const rows = await this.enrollments.aggregate([
      { $group: { _id: null, recordedPlanPayments: { $sum: '$price' }, enrollments: { $sum: 1 } } },
    ]);
    return {
      recordedPlanPayments: rows[0]?.recordedPlanPayments ?? 0,
      enrollments: rows[0]?.enrollments ?? 0,
      currency: 'EGP',
      basis:
        'Manual plan activation records, not bank settlements. Covered visits have zero separate booking value.',
    };
  }
  async sendDueReminders() {
    const due = await this.dueReminders();
    let sent = 0;
    for (const enrollment of due) {
      const session = await this.connection.startSession();
      try {
        const didSend = await session.withTransaction(async () => {
          const claimed = await this.enrollments
            .updateOne(
              { _id: enrollment._id, expiryReminder: 'PENDING' },
              { $set: { expiryReminder: 'SENT' } },
              { session },
            )
            .exec();
          if (claimed.modifiedCount !== 1) return;
          await this.notifications.create(
            [
              {
                recipientId: enrollment.customerId,
                type: NotificationType.PLAN_EXPIRY,
                title: 'Plan ending soon / باقتك تنتهي قريبًا',
                message: `Your ${enrollment.name} plan ends on ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium' }).format(new Date(enrollment.endsAt.getTime() - 1))}. Unused visits expire. Renewal requires admin confirmation. / تنتهي باقتك قريبًا. الزيارات غير المستخدمة لا تُرحّل، والتجديد يحتاج إلى تأكيد الإدارة.`,
                data: {},
                read: false,
              },
            ],
            { session },
          );
          return true;
        });
        if (didSend) sent++;
      } catch (error) {
        this.transactionError(error);
      } finally {
        await session.endSession();
      }
    }
    return { sent };
  }
  dueReminders() {
    const now = new Date();
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now);
    const cutoff = new Date(`${localDate}T12:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() + 4);
    let limit: Date;
    try {
      limit = cairoAppointment(cutoff.toISOString().slice(0, 10), '00:00');
    } catch {
      limit = cairoAppointment(cutoff.toISOString().slice(0, 10), '01:00');
    }
    return this.enrollments
      .find({
        endsAt: { $gt: now, $lte: limit },
        expiryReminder: 'PENDING',
      })
      .sort({ endsAt: 1 })
      .limit(100)
      .exec();
  }
  list(customerId?: string) {
    return this.enrollments
      .find(customerId ? { customerId } : {})
      .sort({ createdAt: -1 })
      .populate({ path: 'vehicleId', select: 'brand model plateNumber vehicleType year color' })
      .populate({ path: 'customerId', select: 'name email' })
      .exec();
  }
  async cancelEnrollment(id: string, customerId: string) {
    const result = await this.enrollments
      .findOneAndUpdate(
        { _id: id, customerId },
        { $set: { status: 'CANCEL_AT_END' } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!result) throw new NotFoundException('Enrollment not found.');
    return result;
  }
  async redeem(id: string, customerId: string, dto: RedeemVisitDto) {
    await this.requireIndexes();
    const key = `${id}:${dto.requestKey}`;
    const previous = await this.bookings.findOne({ redemptionKey: key, customerId }).exec();
    if (previous) return this.validateReplay(previous, dto);
    await this.bookings.init();
    const session = await this.connection.startSession();
    let result: BookingDocument | undefined;
    try {
      await session.withTransaction(async () => {
        const enrollment = await this.enrollments
          .findOne({ _id: id, customerId })
          .session(session)
          .exec();
        if (!enrollment) throw new NotFoundException('Enrollment not found.');
        const now = new Date();
        if (now >= enrollment.endsAt) throw new BadRequestException('Plan expired.');
        const payload = dto.booking;
        if (payload.vehicleId !== enrollment.vehicleId.toString())
          throw new BadRequestException('Plan is for a different vehicle.');
        if (payload.services.length !== 1 || payload.services[0].addOnIds.length)
          throw new BadRequestException('Redeem one included service per visit, without add-ons.');
        const selected = payload.services[0].serviceId;
        const slug = Object.keys(enrollment.serviceIds).find(
          (s) => enrollment.serviceIds[s] === selected,
        );
        if (!slug) throw new BadRequestException('Service is not included in this plan.');
        const appointment = this.appointment(payload.date, payload.startTime);
        if (
          appointment < now ||
          appointment < enrollment.startsAt ||
          appointment >= enrollment.endsAt
        )
          throw new BadRequestException('Visit must be within the active plan period.');
        const updated = await this.enrollments
          .updateOne(
            { _id: id, [`remaining.${slug}`]: { $gt: 0 }, endsAt: { $gt: now } },
            { $inc: { [`remaining.${slug}`]: -1 } },
            { session },
          )
          .exec();
        if (updated.modifiedCount !== 1)
          throw new ConflictException('No visits remain for this service.');
        result = await this.bookingService.create(customerId, payload, {
          session,
          enrollmentId: id,
          redemptionKey: key,
          requestFingerprint: this.fingerprint(dto),
        });
        await this.notifyAdmins(result, session);
      });
      return result;
    } catch (error) {
      const existing = await this.bookings.findOne({ redemptionKey: key, customerId }).exec();
      if (existing) return this.validateReplay(existing, dto);
      this.transactionError(error);
    } finally {
      await session.endSession();
    }
  }
  async adminCancelVisit(id: string, bookingId: string) {
    const enrollment = await this.enrollments.findById(id).exec();
    if (!enrollment) throw new NotFoundException('Enrollment not found.');
    return this.cancelVisit(id, bookingId, enrollment.customerId.toString());
  }
  async cancelVisit(id: string, bookingId: string, customerId: string) {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await this.bookings
          .findOne({ _id: bookingId, enrollmentId: id, customerId })
          .session(session)
          .exec();
        if (!booking) throw new NotFoundException('Plan visit not found.');
        if (booking.status === BookingStatus.CANCELLED) return;
        if (booking.status === BookingStatus.COMPLETED)
          throw new BadRequestException('Completed visit cannot be cancelled.');
        const enrollment = await this.enrollments
          .findOne({ _id: id, customerId })
          .session(session)
          .exec();
        if (!enrollment) throw new NotFoundException('Enrollment not found.');
        const appointment = cairoAppointment(booking.date, booking.startTime);
        const restore =
          appointment.getTime() - Date.now() >= 24 * 3600000 && new Date() < enrollment.endsAt;
        booking.status = BookingStatus.CANCELLED;
        await booking.save({ session });
        const slug = Object.keys(enrollment.serviceIds).find(
          (s) => enrollment.serviceIds[s] === booking.serviceId.toString(),
        );
        if (restore && slug)
          await this.enrollments
            .updateOne({ _id: id }, { $inc: { [`remaining.${slug}`]: 1 } }, { session })
            .exec();
      });
      return this.bookings.findOne({ _id: bookingId, enrollmentId: id, customerId }).exec();
    } catch (error) {
      this.transactionError(error);
    } finally {
      await session.endSession();
    }
  }
  async rescheduleVisit(id: string, bookingId: string, customerId: string, dto: RedeemVisitDto) {
    await this.requireIndexes();
    const existing = await this.bookings
      .findOne({ redemptionKey: `${id}:reschedule:${bookingId}:${dto.requestKey}`, customerId })
      .exec();
    if (existing) return this.validateReplay(existing, dto);
    const session = await this.connection.startSession();
    let result: BookingDocument | undefined;
    try {
      await session.withTransaction(async () => {
        const booking = await this.bookings
          .findOne({ _id: bookingId, enrollmentId: id, customerId })
          .session(session)
          .exec();
        if (!booking) throw new NotFoundException('Plan visit not found.');
        if (
          booking.status === BookingStatus.COMPLETED ||
          booking.status === BookingStatus.CANCELLED
        )
          throw new BadRequestException('This visit cannot be rescheduled.');
        if (cairoAppointment(booking.date, booking.startTime).getTime() - Date.now() < 24 * 3600000)
          throw new BadRequestException('Reschedule at least 24 hours before the appointment.');
        const enrollment = await this.enrollments
          .findOne({ _id: id, customerId })
          .session(session)
          .exec();
        if (!enrollment) throw new NotFoundException('Enrollment not found.');
        const payload = dto.booking;
        if (
          payload.vehicleId !== enrollment.vehicleId.toString() ||
          payload.services.length !== 1 ||
          payload.services[0].serviceId !== booking.serviceId.toString() ||
          payload.services[0].addOnIds.length
        )
          throw new BadRequestException(
            'Rescheduling cannot change the vehicle, service or add-ons.',
          );
        const appointment = this.appointment(payload.date, payload.startTime);
        if (
          appointment < new Date() ||
          appointment >= enrollment.endsAt ||
          appointment < enrollment.startsAt
        )
          throw new BadRequestException('Visit must be within the active plan period.');
        // Release the original minute keys inside the same transaction. A failed
        // replacement rolls this cancellation back with the new reservation.
        booking.status = BookingStatus.CANCELLED;
        await booking.save({ session });
        result = await this.bookingService.create(customerId, payload, {
          session,
          enrollmentId: id,
          redemptionKey: `${id}:reschedule:${bookingId}:${dto.requestKey}`,
          requestFingerprint: this.fingerprint(dto),
        });
        await this.notifyAdmins(result, session);
      });
      return result;
    } catch (error) {
      const replay = await this.bookings
        .findOne({ redemptionKey: `${id}:reschedule:${bookingId}:${dto.requestKey}`, customerId })
        .exec();
      if (replay) return this.validateReplay(replay, dto);
      this.transactionError(error);
    } finally {
      await session.endSession();
    }
  }
  private async requireIndexes() {
    try {
      const plan = await this.enrollments.collection.indexes(),
        booking = await this.bookings.collection.indexes();
      if (
        !plan.some((index) => index.unique && index.key.activationKey === 1) ||
        !booking.some(
          (index) =>
            index.unique &&
            index.key.redemptionKey === 1 &&
            index.partialFilterExpression?.redemptionKey?.$type === 'string',
        )
      )
        throw Error('Missing plan indexes');
    } catch {
      throw new ServiceUnavailableException(
        'Plan activation is not ready. Required migration has not been verified. No booking or allowance changes were made.',
      );
    }
  }
  private async notifyAdmins(booking: BookingDocument, session: ClientSession) {
    const admins = await this.users
      .find({ role: UserRole.ADMIN })
      .select('_id')
      .session(session)
      .exec();
    if (!admins.length) return;
    await this.notifications.create(
      admins.map((admin) => ({
        recipientId: admin._id.toString(),
        type: NotificationType.BOOKING_STATUS,
        title: 'New plan visit / زيارة باقة جديدة',
        message: `A covered plan visit was booked for ${booking.date} at ${booking.startTime}. No separate visit charge. / تم حجز زيارة مشمولة في الباقة دون رسوم منفصلة.`,
        data: {
          bookingId: booking._id.toString(),
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          total: 0,
        },
        read: false,
      })),
      { session, ordered: true },
    );
  }
  private appointment(date: string, time: string) {
    try {
      return cairoAppointment(date, time);
    } catch {
      throw new BadRequestException('Invalid or ambiguous Cairo appointment time.');
    }
  }
  private fingerprint(dto: RedeemVisitDto) {
    const b = dto.booking;
    return createHash('sha256')
      .update(
        JSON.stringify({
          vehicleId: b.vehicleId,
          date: b.date,
          startTime: b.startTime,
          services: b.services.map((x) => ({
            serviceId: x.serviceId,
            addOnIds: [...x.addOnIds].sort(),
          })),
          location: {
            country: b.location.country,
            city: b.location.city,
            address: b.location.address,
            notes: b.location.notes ?? '',
            latitude: b.location.latitude ?? null,
            longitude: b.location.longitude ?? null,
          },
        }),
      )
      .digest('hex');
  }
  private validateReplay(booking: BookingDocument, dto: RedeemVisitDto) {
    if (booking.requestFingerprint !== this.fingerprint(dto))
      throw new ConflictException('Request key was used for a different booking.');
    return booking;
  }
  private transactionError(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 20 || error.code === 303)
    )
      throw new ServiceUnavailableException(
        'Plan visits are temporarily unavailable. No visit allowance was charged. Please contact the center.',
      );
    throw error;
  }
}
