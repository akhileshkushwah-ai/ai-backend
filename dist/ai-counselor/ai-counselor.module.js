"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiCounselorModule = void 0;
const common_1 = require("@nestjs/common");
const ai_counselor_controller_1 = require("./ai-counselor.controller");
const ai_counselor_service_1 = require("./ai-counselor.service");
const ai_counselor_gateway_1 = require("./ai-counselor.gateway");
let AiCounselorModule = class AiCounselorModule {
};
exports.AiCounselorModule = AiCounselorModule;
exports.AiCounselorModule = AiCounselorModule = __decorate([
    (0, common_1.Module)({
        controllers: [ai_counselor_controller_1.AiCounselorController],
        providers: [ai_counselor_service_1.AiCounselorService, ai_counselor_gateway_1.AiCounselorGateway],
        exports: [ai_counselor_service_1.AiCounselorService, ai_counselor_gateway_1.AiCounselorGateway],
    })
], AiCounselorModule);
//# sourceMappingURL=ai-counselor.module.js.map