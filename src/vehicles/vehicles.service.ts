import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(@InjectModel(Vehicle.name) private readonly vehicleModel: Model<VehicleDocument>) {}

  async findAllForUser(userId: string): Promise<VehicleDocument[]> {
    return this.vehicleModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async create(userId: string, dto: CreateVehicleDto): Promise<VehicleDocument> {
    const created = new this.vehicleModel({ ...dto, userId });
    return created.save();
  }

  async findForUser(userId: string, id: string): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel.findOne({ _id: id, userId }).exec();
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }
    return vehicle;
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto): Promise<VehicleDocument> {
    const vehicle = await this.findForUser(userId, id);
    const patch = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(vehicle, patch);
    return vehicle.save();
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.vehicleModel.findOneAndDelete({ _id: id, userId }).exec();
    if (!result) {
      throw new NotFoundException('Vehicle not found.');
    }
  }
}
