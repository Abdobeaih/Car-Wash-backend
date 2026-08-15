"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const path_1 = require("path");
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const services_module_1 = require("./services/services.module");
const addons_module_1 = require("./addons/addons.module");
const vehicles_module_1 = require("./vehicles/vehicles.module");
const bookings_module_1 = require("./bookings/bookings.module");
const admin_module_1 = require("./admin/admin.module");
const notifications_module_1 = require("./notifications/notifications.module");
const contact_module_1 = require("./contact/contact.module");
const seed_module_1 = require("./seed/seed.module");
const health_module_1 = require("./health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                ignoreEnvFile: process.env.NODE_ENV === 'production',
                envFilePath: [(0, path_1.join)(process.cwd(), '.env'), (0, path_1.join)(__dirname, '..', '.env')],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const uri = config.get('DATABASE_URL');
                    if (process.env.NODE_ENV === 'production' && !uri) {
                        throw new Error('DATABASE_URL is not set. Add it to your hosting environment (e.g. Vercel project env).');
                    }
                    return {
                        uri: uri ?? 'mongodb://127.0.0.1:27017/mobile-car-care',
                        serverSelectionTimeoutMS: 5000,
                        connectTimeoutMS: 5000,
                        retryAttempts: 1,
                        retryDelay: 1000,
                        bufferCommands: false,
                    };
                },
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            services_module_1.ServicesModule,
            addons_module_1.AddOnsModule,
            vehicles_module_1.VehiclesModule,
            bookings_module_1.BookingsModule,
            admin_module_1.AdminModule,
            notifications_module_1.NotificationsModule,
            contact_module_1.ContactModule,
            seed_module_1.SeedModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map