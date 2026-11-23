import { Controller, Get, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { EnrollmentReviewGuard } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
@Controller('internal/plan-reminders')
@UseGuards(EnrollmentReviewGuard)
export class PlanRemindersController {
  constructor(private readonly enrollments: EnrollmentsService) {}
  @Get() run(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET;
    const expected = Buffer.from(`Bearer ${secret ?? ''}`),
      received = Buffer.from(authorization ?? '');
    if (
      !secret ||
      secret.length < 32 ||
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      throw new UnauthorizedException();
    return this.enrollments.sendDueReminders();
  }
}
