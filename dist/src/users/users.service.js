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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("./schemas/user.schema");
const roles_1 = require("../common/constants/roles");
const otp_schema_1 = require("../otp/schemas/otp.schema");
let UsersService = class UsersService {
    userModel;
    constructor(userModel) {
        this.userModel = userModel;
    }
    async create(data) {
        const hashed = await bcrypt.hash(data.password, 12);
        const created = new this.userModel({
            name: data.name,
            email: data.email.toLowerCase(),
            password: hashed,
            phone: data.phone,
            countryCode: data.countryCode,
            verificationChannel: data.verificationChannel ?? otp_schema_1.OtpChannel.EMAIL,
            role: data.role ?? roles_1.UserRole.CUSTOMER,
        });
        const saved = await created.save();
        return this.toSafeUser(saved);
    }
    async findByEmail(email) {
        return this.userModel
            .findOne({ email: email.toLowerCase() })
            .select('+password +passwordResetToken +passwordResetExpires')
            .exec();
    }
    async findById(id) {
        const user = await this.userModel.findById(id).exec();
        return user ? this.toSafeUser(user) : null;
    }
    async findByIdWithPassword(id) {
        return this.userModel.findById(id).select('+password').exec();
    }
    async updateProfile(id, data) {
        const user = await this.userModel.findById(id).exec();
        if (!user)
            return null;
        if (data.name !== undefined)
            user.name = data.name;
        if (data.email !== undefined)
            user.email = data.email.toLowerCase();
        const saved = await user.save();
        return this.toSafeUser(saved);
    }
    async updatePassword(id, password) {
        const hashed = await bcrypt.hash(password, 12);
        await this.userModel.updateOne({ _id: id }, { $set: { password: hashed } }).exec();
    }
    async setPasswordReset(id, tokenHash, expires) {
        await this.userModel
            .updateOne({ _id: id }, { $set: { passwordResetToken: tokenHash, passwordResetExpires: expires } })
            .exec();
    }
    async clearPasswordReset(id) {
        await this.userModel
            .updateOne({ _id: id }, { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } })
            .exec();
    }
    async markEmailVerified(id) {
        await this.userModel
            .updateOne({ _id: id }, { $set: { emailVerified: true, emailVerifiedAt: new Date() } })
            .exec();
    }
    async deleteUser(id) {
        await this.userModel.deleteOne({ _id: id }).exec();
    }
    async verifyPassword(user, password) {
        return bcrypt.compare(password, user.password);
    }
    toSafeUser(user) {
        return {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map