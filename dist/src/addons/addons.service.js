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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOnsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const addon_schema_1 = require("./schemas/addon.schema");
let AddOnsService = class AddOnsService {
    addOnModel;
    constructor(addOnModel) {
        this.addOnModel = addOnModel;
    }
    async findAll() {
        return this.addOnModel.find().sort({ name: 1 }).exec();
    }
    async findPublic() {
        return this.addOnModel.find({ isActive: true }).sort({ name: 1 }).exec();
    }
    async create(dto) {
        const created = new this.addOnModel(dto);
        return created.save();
    }
    async update(id, dto) {
        const existing = await this.addOnModel.findById(id).exec();
        if (!existing) {
            throw new common_1.NotFoundException('Add-on not found.');
        }
        Object.assign(existing, dto);
        return existing.save();
    }
    async remove(id) {
        const result = await this.addOnModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new common_1.NotFoundException('Add-on not found.');
        }
    }
};
exports.AddOnsService = AddOnsService;
exports.AddOnsService = AddOnsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(addon_schema_1.AddOn.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object])
], AddOnsService);
//# sourceMappingURL=addons.service.js.map