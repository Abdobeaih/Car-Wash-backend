import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('contact')
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }

  @Get('admin/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.contactService.findAll();
  }

  @Get('admin/messages/unread-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getUnreadCount() {
    return this.contactService.getUnreadCount();
  }

  @Patch('admin/messages/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  markAsRead(@Param('id', ParseMongoIdPipe) id: string) {
    return this.contactService.markAsRead(id);
  }
}
