import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceDocument = HydratedDocument<CarService>;

@Schema({ timestamps: true })
export class CarService {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true, min: 0 })
  basePrice: number;

  @Prop({ required: true, min: 15 })
  duration: number;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const ServiceSchema = SchemaFactory.createForClass(CarService);
