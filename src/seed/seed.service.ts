import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CarService, ServiceDocument } from '../services/schemas/service.schema';
import { AddOn, AddOnDocument } from '../addons/schemas/addon.schema';
import { UserRole } from '../common/constants/roles';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CarService.name) private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(AddOn.name) private readonly addOnModel: Model<AddOnDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedServices();
    await this.seedAddOns();
    await this.seedUsers();
  }

  private async seedServices(): Promise<void> {
    const count = await this.serviceModel.estimatedDocumentCount();
    if (count > 0) return;

    const services = [
      {
        name: 'Exterior Car Wash',
        slug: 'exterior-car-wash',
        description:
          'A complete exterior wash including foam pre-wash, hand wash, wheel cleaning and spot-free rinse to leave your car shining.',
        image: '/images/services/exterior-wash.svg',
        basePrice: 35,
        duration: 60,
        isActive: true,
      },
      {
        name: 'Interior Cleaning',
        slug: 'interior-cleaning',
        description:
          'Professional interior vacuum, dashboard and console wipe-down, seat cleaning and window polish for a fresh cabin.',
        image: '/images/services/interior-cleaning.svg',
        basePrice: 45,
        duration: 90,
        isActive: true,
      },
      {
        name: 'Full Car Detailing',
        slug: 'full-car-detailing',
        description:
          'A thorough exterior and interior detail including wash, wax, interior deep clean and trim restoration.',
        image: '/images/services/full-detailing.svg',
        basePrice: 120,
        duration: 120,
        isActive: true,
      },
      {
        name: 'Premium Detailing',
        slug: 'premium-detailing',
        description:
          'Our top-tier package with machine polish, paint protection, leather conditioning and a showroom-quality finish.',
        image: '/images/services/premium-detailing.svg',
        basePrice: 220,
        duration: 180,
        isActive: true,
      },
    ];

    await this.serviceModel.insertMany(services);
    this.logger.log('Seeded 4 services.');
  }

  private async seedAddOns(): Promise<void> {
    const count = await this.addOnModel.estimatedDocumentCount();
    if (count > 0) return;

    const addOns = [
      {
        name: 'Tire Cleaning',
        description: 'Deep clean and shine treatment for all tires and rims.',
        price: 10,
        isActive: true,
      },
      {
        name: 'Engine Bay Cleaning',
        description: 'Safe steam cleaning and degreasing of the engine bay.',
        price: 20,
        isActive: true,
      },
      {
        name: 'Leather Conditioning',
        description: 'Cleans and conditions leather seats to prevent cracking.',
        price: 25,
        isActive: true,
      },
      {
        name: 'Odor Treatment',
        description: 'Neutralizes unpleasant odors and leaves a fresh scent.',
        price: 15,
        isActive: true,
      },
    ];

    await this.addOnModel.insertMany(addOns);
    this.logger.log('Seeded 4 add-ons.');
  }

  private async seedUsers(): Promise<void> {
    const adminName = this.configService.get<string>('SEED_ADMIN_NAME') ?? 'Admin User';
    const adminEmail = this.configService.get<string>('SEED_ADMIN_EMAIL') ?? 'admin@example.com';
    const adminPassword = this.configService.get<string>('SEED_ADMIN_PASSWORD') ?? 'AdminPass123!';

    const existingAdmin = await this.userModel
      .findOne({ email: adminEmail })
      .select('+password')
      .exec();
    if (existingAdmin) {
      const passwordMatches = await bcrypt.compare(adminPassword, existingAdmin.password);
      if (
        existingAdmin.role !== UserRole.ADMIN ||
        !passwordMatches ||
        !existingAdmin.emailVerified
      ) {
        existingAdmin.name = adminName;
        existingAdmin.role = UserRole.ADMIN;
        existingAdmin.emailVerified = true;
        if (!passwordMatches) {
          existingAdmin.password = await bcrypt.hash(adminPassword, 12);
        }
        await existingAdmin.save();
        this.logger.log(`Updated admin credentials to match SEED_ADMIN_* (${adminEmail}).`);
      }
    } else {
      await this.userModel.create({
        name: adminName,
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 12),
        role: UserRole.ADMIN,
        emailVerified: true,
      });
      this.logger.log(`Seeded admin user: ${adminEmail}`);
    }

    const customerEmail =
      this.configService.get<string>('SEED_CUSTOMER_EMAIL') ?? 'customer@example.com';
    const customerExists = await this.userModel.exists({ email: customerEmail });
    if (!customerExists) {
      await this.userModel.create({
        name: this.configService.get<string>('SEED_CUSTOMER_NAME') ?? 'Demo Customer',
        email: customerEmail,
        password: await bcrypt.hash(
          this.configService.get<string>('SEED_CUSTOMER_PASSWORD') ?? 'CustomerPass123!',
          12,
        ),
        role: UserRole.CUSTOMER,
        emailVerified: true,
      });
      this.logger.log(`Seeded customer user: ${customerEmail}`);
    }
  }
}
