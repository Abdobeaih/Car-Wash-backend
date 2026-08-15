"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOnsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const addon_schema_1 = require("./schemas/addon.schema");
const addons_service_1 = require("./addons.service");
const addons_controller_1 = require("./addons.controller");
let AddOnsModule = class AddOnsModule {
};
exports.AddOnsModule = AddOnsModule;
exports.AddOnsModule = AddOnsModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: addon_schema_1.AddOn.name, schema: addon_schema_1.AddOnSchema }])],
        controllers: [addons_controller_1.AddOnsController],
        providers: [addons_service_1.AddOnsService],
        exports: [addons_service_1.AddOnsService],
    })
], AddOnsModule);
//# sourceMappingURL=addons.module.js.map