import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Injectable,
  CanActivate,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { EnrollmentsService } from './enrollments.service';
import { ActivateEnrollmentDto, RedeemVisitDto } from './enrollments.dto';
import { PLAN_CATALOG } from './terms';
@Injectable()
export class EnrollmentReviewGuard implements CanActivate {
  canActivate() {
    if (process.env.ENABLE_PLAN_ENROLLMENTS !== 'true') throw new NotFoundException();
    return true;
  }
}
@Controller('plans')
@UseGuards(EnrollmentReviewGuard, JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}
  @Get('catalog') catalog() {
    return PLAN_CATALOG;
  }
  @Get('enrollments') @Roles(UserRole.CUSTOMER) list(@CurrentUser() user: RequestUser) {
    return this.enrollments.list(user.id);
  }
  @Post('admin/reminders')
  @Roles(UserRole.ADMIN)
  sendReminders() {
    return this.enrollments.sendDueReminders();
  }
  @Get('admin/summary')
  @Roles(UserRole.ADMIN)
  summary() {
    return this.enrollments.revenueSummary();
  }
  @Post('admin/enrollments/:id/visits/:bookingId/cancel') @Roles(UserRole.ADMIN) adminCancelVisit(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('bookingId', ParseMongoIdPipe) bookingId: string,
  ) {
    return this.enrollments.adminCancelVisit(id, bookingId);
  }
  @Get('admin/reminders-due')
  @Roles(UserRole.ADMIN)
  reminders() {
    return this.enrollments.dueReminders();
  }
  @Get('admin/customers/:customerId/vehicles') @Roles(UserRole.ADMIN) vehicles(
    @Param('customerId', ParseMongoIdPipe) customerId: string,
  ) {
    return this.enrollments.customerVehicles(customerId);
  }
  @Get('admin/enrollments') @Roles(UserRole.ADMIN) all() {
    return this.enrollments.list();
  }
  @Post('admin/enrollments') @Roles(UserRole.ADMIN) activate(
    @CurrentUser() user: RequestUser,
    @Body() dto: ActivateEnrollmentDto,
  ) {
    return this.enrollments.activate(dto, user.id);
  }
  @Post('enrollments/:id/cancel') @Roles(UserRole.CUSTOMER) cancel(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.enrollments.cancelEnrollment(id, user.id);
  }
  @Post('enrollments/:id/visits') @Roles(UserRole.CUSTOMER) redeem(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: RedeemVisitDto,
  ) {
    return this.enrollments.redeem(id, user.id, dto);
  }
  @Post('enrollments/:id/visits/:bookingId/cancel') @Roles(UserRole.CUSTOMER) cancelVisit(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('bookingId', ParseMongoIdPipe) bookingId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.enrollments.cancelVisit(id, bookingId, user.id);
  }
  @Post('enrollments/:id/visits/:bookingId/reschedule')
  @Roles(UserRole.CUSTOMER)
  reschedule(
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('bookingId', ParseMongoIdPipe) bookingId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: RedeemVisitDto,
  ) {
    return this.enrollments.rescheduleVisit(id, bookingId, user.id, dto);
  }
}
