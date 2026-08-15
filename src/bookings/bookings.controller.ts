import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { BookingsService } from './bookings.service';
import { AvailabilityService } from './availability.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@Controller()
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get('availability')
  getAvailability(@Query() query: AvailabilityQueryDto) {
    const serviceIds = query.serviceIds
      ? query.serviceIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : query.serviceId
        ? [query.serviceId]
        : [];
    return this.availabilityService.getAvailableSlots(query.date, serviceIds);
  }

  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.id, dto);
  }

  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: RequestUser) {
    return this.bookingsService.findAllForCustomer(user.id);
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard)
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseMongoIdPipe) id: string) {
    return this.bookingsService.findForCustomer(user.id, id);
  }

  @Post('bookings/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: RequestUser, @Param('id', ParseMongoIdPipe) id: string) {
    return this.bookingsService.cancelForCustomer(user.id, id);
  }
}
