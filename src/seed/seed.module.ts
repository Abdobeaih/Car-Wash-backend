import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CarService, ServiceSchema } from '../services/schemas/service.schema';
import { AddOn, AddOnSchema } from '../addons/schemas/addon.schema';
import { SeedService } from './seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CarService.name, schema: ServiceSchema },
      { name: AddOn.name, schema: AddOnSchema },
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
