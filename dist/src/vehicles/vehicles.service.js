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
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const vehicle_schema_1 = require("./schemas/vehicle.schema");
let VehiclesService = class VehiclesService {
    vehicleModel;
    constructor(vehicleModel) {
        this.vehicleModel = vehicleModel;
    }
    async findAllForUser(userId) {
        return this.vehicleModel.find({ userId }).sort({ createdAt: -1 }).exec();
    }
    async create(userId, dto) {
        const created = new this.vehicleModel({ ...dto, userId });
        return created.save();
    }
    async findForUser(userId, id) {
        const vehicle = await this.vehicleModel.findOne({ _id: id, userId }).exec();
        if (!vehicle) {
            throw new common_1.NotFoundException('Vehicle not found.');
        }
        return vehicle;
    }
    async update(userId, id, dto) {
        const vehicle = await this.findForUser(userId, id);
        const patch = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
        Object.assign(vehicle, patch);
        return vehicle.save();
    }
    async remove(userId, id) {
        const result = await this.vehicleModel.findOneAndDelete({ _id: id, userId }).exec();
        if (!result) {
            throw new common_1.NotFoundException('Vehicle not found.');
        }
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(vehicle_schema_1.Vehicle.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map