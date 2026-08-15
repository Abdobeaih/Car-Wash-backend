import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddOn, AddOnSchema } from './schemas/addon.schema';
import { AddOnsService } from './addons.service';
import { AddOnsController } from './addons.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: AddOn.name, schema: AddOnSchema }])],
  controllers: [AddOnsController],
  providers: [AddOnsService],
  exports: [AddOnsService],
})
export class AddOnsModule {}
