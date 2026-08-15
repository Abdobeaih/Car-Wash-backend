import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AddOnDocument = HydratedDocument<AddOn>;

@Schema({ timestamps: true })
export class AddOn {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const AddOnSchema = SchemaFactory.createForClass(AddOn);
