import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CarService, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(CarService.name)
    private readonly serviceModel: Model<ServiceDocument>,
  ) {}

  async findAll(): Promise<ServiceDocument[]> {
    return this.serviceModel.find().sort({ basePrice: 1 }).exec();
  }

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

  async create(dto: CreateServiceDto): Promise<ServiceDocument> {
    const slug = dto.slug ?? this.slugify(dto.name);
    const existing = await this.serviceModel.findOne({ slug }).exec();
    if (existing) {
      throw new ConflictException('A service with this slug already exists.');
    }
    const created = new this.serviceModel({ ...dto, slug });
    return created.save();
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceDocument> {
    const existing = await this.serviceModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Service not found.');
    }
    const payload: Record<string, unknown> = { ...dto };
    if (dto.name && !dto.slug) {
      payload.slug = this.slugify(dto.name);
    }
    Object.assign(existing, payload);
    return existing.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.serviceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Service not found.');
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
