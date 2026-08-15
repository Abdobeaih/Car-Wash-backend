import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

export enum VehicleType {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  PICKUP = 'PICKUP',
  LUXURY = 'LUXURY',
}

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'User', index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  brand: string;

  @Prop({ required: true, trim: true })
  model: string;

  @Prop({ required: true, min: 1980, max: 2100 })
  year: number;

  @Prop({ required: true, trim: true })
  color: string;

  @Prop({ required: true, trim: true })
  plateNumber: string;

  @Prop({ required: true, enum: VehicleType, type: String })
  vehicleType: VehicleType;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
VehicleSchema.index({ userId: 1, plateNumber: 1 }, { unique: true });
