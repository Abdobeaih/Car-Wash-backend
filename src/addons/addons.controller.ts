import { Controller, Get } from '@nestjs/common';
import { AddOnsService } from './addons.service';

@Controller('add-ons')
export class AddOnsController {
  constructor(private readonly addOnsService: AddOnsService) {}

  @Get()
  findAll() {
    return this.addOnsService.findPublic();
  }
}
