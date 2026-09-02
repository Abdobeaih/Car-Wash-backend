import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CarService, ServiceDocument } from './schemas/service.schema';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(CarService.name)
    private readonly serviceModel: Model<ServiceDocument>,
  ) {}

  async findPublic(): Promise<ServiceDocument[]> {
    return this.serviceModel.find({ isActive: true }).sort({ basePrice: 1 }).exec();
  }

  async findBySlug(slug: string, publicOnly = false): Promise<ServiceDocument> {
    const query: Record<string, unknown> = { slug };
    if (publicOnly) query.isActive = true;
    const service = await this.serviceModel.findOne(query).exec();
    if (!service) {
      throw new NotFoundException('Service not found.');
    }
    return service;
  }
}
