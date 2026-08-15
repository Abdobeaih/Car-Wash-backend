import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { AdminService } from './admin.service';
import { CreateServiceDto, UpdateServiceDto } from '../services/dto/service.dto';
import { CreateAddOnDto, UpdateAddOnDto } from '../addons/dto/addon.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('calendar')
  getCalendar(@Query('start') start?: string, @Query('end') end?: string) {
    return this.adminService.getCalendar(start, end);
  }

  @Get('services')
  getServices() {
    return this.adminService.getServices();
  }

  @Post('services')
  createService(@Body() dto: CreateServiceDto) {
    return this.adminService.createService(dto);
  }

  @Patch('services/:id')
  updateService(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateServiceDto) {
    return this.adminService.updateService(id, dto);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteService(@Param('id', ParseMongoIdPipe) id: string) {
    return this.adminService.deleteService(id);
  }

  @Get('add-ons')
  getAddOns() {
    return this.adminService.getAddOns();
  }

  @Post('add-ons')
  createAddOn(@Body() dto: CreateAddOnDto) {
    return this.adminService.createAddOn(dto);
  }

  @Patch('add-ons/:id')
  updateAddOn(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateAddOnDto) {
    return this.adminService.updateAddOn(id, dto);
  }

  @Delete('add-ons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAddOn(@Param('id', ParseMongoIdPipe) id: string) {
    return this.adminService.deleteAddOn(id);
  }

  @Get('bookings')
  getBookings(@Query('status') status?: string, @Query('search') search?: string) {
    return this.adminService.getBookings(status, search);
  }

  @Get('bookings/:id')
  getBooking(@Param('id', ParseMongoIdPipe) id: string) {
    return this.adminService.getBooking(id);
  }

  @Patch('bookings/:id/status')
  updateBookingStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.adminService.updateBookingStatus(id, dto);
  }

  @Get('customers')
  getCustomers(@Query('search') search?: string) {
    return this.adminService.getCustomers(search);
  }
}
