import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddOn, AddOnDocument } from './schemas/addon.schema';

@Injectable()
export class AddOnsService {
  constructor(@InjectModel(AddOn.name) private readonly addOnModel: Model<AddOnDocument>) {}

  async findPublic(): Promise<AddOnDocument[]> {
    return this.addOnModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }
}
