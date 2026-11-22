import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { UserRole } from '../src/common/constants/roles';
import { ParseMongoIdPipe } from '../src/common/pipes/parse-mongo-id.pipe';
import { slugify } from '../src/common/utils/slugify';
import { AvailabilityService } from '../src/bookings/availability.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBookingDto } from '../src/bookings/dto/create-booking.dto';
import { ExecutionContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { CarService } from '../src/services/schemas/service.schema';
import { BookingDocument } from '../src/bookings/schemas/booking.schema';

const objectId = '507f1f77bcf86cd799439011';
describe('RolesGuard', () => {
  const context = (role?: UserRole) =>
    ({
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    }) as unknown as ExecutionContext;
  it('allows routes with no role requirement', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(context())).toBe(true);
  });
  it.each([undefined, UserRole.CUSTOMER])('denies admin-only access for %s', (role) => {
    const reflector = { getAllAndOverride: () => [UserRole.ADMIN] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(context(role))).toThrow(ForbiddenException);
  });
  it('allows the current ADMIN role', () => {
    const reflector = { getAllAndOverride: () => [UserRole.ADMIN] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(context(UserRole.ADMIN))).toBe(true);
  });
});
describe('Input primitives', () => {
  const pipe = new ParseMongoIdPipe();
  it('accepts a real ObjectId', () => expect(pipe.transform(objectId)).toBe(objectId));
  it.each(['', 'invalid', '507f1f77bcf86cd79943901Z', '$ne'])(
    'rejects malformed database id %s',
    (input) => {
      expect(() => pipe.transform(input)).toThrow(BadRequestException);
    },
  );
  it.each([
    ['Full Car Detailing', 'full-car-detailing'],
    ['  Wash & Wax! ', 'wash-wax'],
    ['A--B', 'a-b'],
  ])('makes stable slugs for %s', (input, expected) => expect(slugify(input)).toBe(expected));
  const base = {
    vehicleId: objectId,
    services: [{ serviceId: objectId, addOnIds: [] }],
    date: '2030-12-20',
    startTime: '09:00',
    location: { country: 'Egypt', city: 'Cairo', address: 'Fixture street' },
  };
  it('accepts a complete nested booking', async () =>
    expect(await validate(plainToInstance(CreateBookingDto, base))).toHaveLength(0));
  it.each([
    { services: [] },
    { date: '2030-02-30' },
    { startTime: '25:00' },
    { services: [{ serviceId: objectId, addOnIds: [objectId, objectId] }] },
    { location: { ...base.location, latitude: -91 } },
    { location: { ...base.location, longitude: 181 } },
    { location: { ...base.location, latitude: { $ne: 0 } } },
  ])('rejects invalid nested booking %j', async (patch) => {
    expect(
      (await validate(plainToInstance(CreateBookingDto, { ...base, ...patch }))).length,
    ).toBeGreaterThan(0);
  });
});
describe('AvailabilityService time boundaries', () => {
  function service(
    services = [{ duration: 60, isActive: true }],
    bookings: { startTime: string; endTime: string }[] = [],
  ) {
    const catalog = { find: jest.fn(() => ({ exec: async () => services })) };
    const reservations = { find: jest.fn(() => ({ exec: async () => bookings })) };
    return new AvailabilityService(
      catalog as unknown as Model<CarService>,
      reservations as unknown as Model<BookingDocument>,
    );
  }
  it('does not offer slots before opening or beyond closing', async () => {
    const slots = await service().getAvailableSlots('2030-12-20', [objectId]);
    expect(slots[0]).toMatchObject({ start: '09:00', end: '10:00' });
    expect(slots.every((slot) => slot.start >= '09:00' && slot.end <= '18:00')).toBe(true);
  });
  it('blocks overlaps but allows exact adjacent appointments', async () => {
    const slots = await service(undefined, [
      { startTime: '10:00', endTime: '11:00' },
    ]).getAvailableSlots('2030-12-20', [objectId]);
    expect(slots.find((s) => s.start === '09:00')?.available).toBe(true);
    expect(slots.find((s) => s.start === '10:00')?.available).toBe(false);
    expect(slots.find((s) => s.start === '11:00')?.available).toBe(true);
  });
  it('sums multiple service durations', async () => {
    const slots = await service([
      { duration: 60, isActive: true },
      { duration: 90, isActive: true },
    ]).getAvailableSlots('2030-12-20', [objectId, '507f191e810c19729de860ea']);
    expect(slots[0].end).toBe('11:30');
  });
  it('returns no slots when duration exceeds working hours', async () => {
    expect(
      await service([{ duration: 600, isActive: true }]).getAvailableSlots('2030-12-20', [
        objectId,
      ]),
    ).toHaveLength(0);
  });
  it('rejects missing and inactive services', async () => {
    await expect(service().getAvailableSlots('2030-12-20', [])).rejects.toThrow(NotFoundException);
    await expect(service([]).getAvailableSlots('2030-12-20', [objectId])).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service([{ duration: 60, isActive: false }]).getAvailableSlots('2030-12-20', [objectId]),
    ).rejects.toThrow(NotFoundException);
  });
});
