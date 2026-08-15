"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const service_schema_1 = require("./schemas/service.schema");
let ServicesService = class ServicesService {
    serviceModel;
    constructor(serviceModel) {
        this.serviceModel = serviceModel;
    }
    async findAll() {
        return this.serviceModel.find().sort({ basePrice: 1 }).exec();
    }
    async findPublic() {
        return this.serviceModel.find({ isActive: true }).sort({ basePrice: 1 }).exec();
    }
    async findBySlug(slug, publicOnly = false) {
        const query = { slug };
        if (publicOnly)
            query.isActive = true;
        const service = await this.serviceModel.findOne(query).exec();
        if (!service) {
            throw new common_1.NotFoundException('Service not found.');
        }
        return service;
    }
    async create(dto) {
        const slug = dto.slug ?? this.slugify(dto.name);
        const existing = await this.serviceModel.findOne({ slug }).exec();
        if (existing) {
            throw new common_1.ConflictException('A service with this slug already exists.');
        }
        const created = new this.serviceModel({ ...dto, slug });
        return created.save();
    }
    async update(id, dto) {
        const existing = await this.serviceModel.findById(id).exec();
        if (!existing) {
            throw new common_1.NotFoundException('Service not found.');
        }
        const payload = { ...dto };
        if (dto.name && !dto.slug) {
            payload.slug = this.slugify(dto.name);
        }
        Object.assign(existing, payload);
        return existing.save();
    }
    async remove(id) {
        const result = await this.serviceModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new common_1.NotFoundException('Service not found.');
        }
    }
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
};
exports.ServicesService = ServicesService;
exports.ServicesService = ServicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(service_schema_1.CarService.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ServicesService);
//# sourceMappingURL=services.service.js.map