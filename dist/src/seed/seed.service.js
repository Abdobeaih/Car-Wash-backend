"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SeedService_1;
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("../users/schemas/user.schema");
const service_schema_1 = require("../services/schemas/service.schema");
const addon_schema_1 = require("../addons/schemas/addon.schema");
const roles_1 = require("../common/constants/roles");
let SeedService = SeedService_1 = class SeedService {
    userModel;
    serviceModel;
    addOnModel;
    configService;
    logger = new common_1.Logger(SeedService_1.name);
    constructor(userModel, serviceModel, addOnModel, configService) {
        this.userModel = userModel;
        this.serviceModel = serviceModel;
        this.addOnModel = addOnModel;
        this.configService = configService;
    }
    async onApplicationBootstrap() {
        await this.seedServices();
        await this.seedAddOns();
        await this.seedUsers();
    }
    async seedServices() {
        const count = await this.serviceModel.estimatedDocumentCount();
        if (count > 0)
            return;
        const services = [
            {
                name: 'Exterior Car Wash',
                slug: 'exterior-car-wash',
                description: 'A complete exterior wash including foam pre-wash, hand wash, wheel cleaning and spot-free rinse to leave your car shining.',
                image: '/images/services/exterior-wash.svg',
                basePrice: 35,
                duration: 60,
                isActive: true,
            },
            {
                name: 'Interior Cleaning',
                slug: 'interior-cleaning',
                description: 'Professional interior vacuum, dashboard and console wipe-down, seat cleaning and window polish for a fresh cabin.',
                image: '/images/services/interior-cleaning.svg',
                basePrice: 45,
                duration: 90,
                isActive: true,
            },
            {
                name: 'Full Car Detailing',
                slug: 'full-car-detailing',
                description: 'A thorough exterior and interior detail including wash, wax, interior deep clean and trim restoration.',
                image: '/images/services/full-detailing.svg',
                basePrice: 120,
                duration: 120,
                isActive: true,
            },
            {
                name: 'Premium Detailing',
                slug: 'premium-detailing',
                description: 'Our top-tier package with machine polish, paint protection, leather conditioning and a showroom-quality finish.',
                image: '/images/services/premium-detailing.svg',
                basePrice: 220,
                duration: 180,
                isActive: true,
            },
        ];
        await this.serviceModel.insertMany(services);
        this.logger.log('Seeded 4 services.');
    }
    async seedAddOns() {
        const count = await this.addOnModel.estimatedDocumentCount();
        if (count > 0)
            return;
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
    async seedUsers() {
        const adminName = this.configService.get('SEED_ADMIN_NAME') ?? 'Admin User';
        const adminEmail = this.configService.get('SEED_ADMIN_EMAIL') ?? 'admin@example.com';
        const adminPassword = this.configService.get('SEED_ADMIN_PASSWORD') ?? 'AdminPass123!';
        const existingAdmin = await this.userModel
            .findOne({ email: adminEmail })
            .select('+password')
            .exec();
        if (existingAdmin) {
            const passwordMatches = await bcrypt.compare(adminPassword, existingAdmin.password);
            if (existingAdmin.role !== roles_1.UserRole.ADMIN ||
                !passwordMatches ||
                !existingAdmin.emailVerified) {
                existingAdmin.name = adminName;
                existingAdmin.role = roles_1.UserRole.ADMIN;
                existingAdmin.emailVerified = true;
                if (!passwordMatches) {
                    existingAdmin.password = await bcrypt.hash(adminPassword, 12);
                }
                await existingAdmin.save();
                this.logger.log(`Updated admin credentials to match SEED_ADMIN_* (${adminEmail}).`);
            }
        }
        else {
            await this.userModel.create({
                name: adminName,
                email: adminEmail,
                password: await bcrypt.hash(adminPassword, 12),
                role: roles_1.UserRole.ADMIN,
                emailVerified: true,
            });
            this.logger.log(`Seeded admin user: ${adminEmail}`);
        }
        const customerEmail = this.configService.get('SEED_CUSTOMER_EMAIL') ?? 'customer@example.com';
        const customerExists = await this.userModel.exists({ email: customerEmail });
        if (!customerExists) {
            await this.userModel.create({
                name: this.configService.get('SEED_CUSTOMER_NAME') ?? 'Demo Customer',
                email: customerEmail,
                password: await bcrypt.hash(this.configService.get('SEED_CUSTOMER_PASSWORD') ?? 'CustomerPass123!', 12),
                role: roles_1.UserRole.CUSTOMER,
                emailVerified: true,
            });
            this.logger.log(`Seeded customer user: ${customerEmail}`);
        }
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = SeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(service_schema_1.CarService.name)),
    __param(2, (0, mongoose_1.InjectModel)(addon_schema_1.AddOn.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, typeof (_b = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _b : Object, typeof (_c = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _c : Object, typeof (_d = typeof config_1.ConfigService !== "undefined" && config_1.ConfigService) === "function" ? _d : Object])
], SeedService);
//# sourceMappingURL=seed.service.js.map