import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddOn, AddOnDocument } from './schemas/addon.schema';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/addon.dto';

@Injectable()
export class AddOnsService {
  constructor(@InjectModel(AddOn.name) private readonly addOnModel: Model<AddOnDocument>) {}

  async findAll(): Promise<AddOnDocument[]> {
    return this.addOnModel.find().sort({ name: 1 }).exec();
  }

  async findPublic(): Promise<AddOnDocument[]> {
    return this.addOnModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async create(dto: CreateAddOnDto): Promise<AddOnDocument> {
    const created = new this.addOnModel(dto);
    return created.save();
  }

  async update(id: string, dto: UpdateAddOnDto): Promise<AddOnDocument> {
    const existing = await this.addOnModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Add-on not found.');
    }
    Object.assign(existing, dto);
    return existing.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.addOnModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Add-on not found.');
    }
  }
}
