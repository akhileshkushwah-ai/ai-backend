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
exports.AiCounselorController = void 0;
const common_1 = require("@nestjs/common");
const ai_counselor_service_1 = require("./ai-counselor.service");
const start_session_dto_1 = require("./dto/start-session.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
let AiCounselorController = class AiCounselorController {
    constructor(counselorService) {
        this.counselorService = counselorService;
    }
    async startSession(body) {
        return this.counselorService.startCounselorSession(body.studentId, body.languagePreference);
    }
    async sendMessage(body) {
        return this.counselorService.sendMessage(body.sessionId, body.message);
    }
    async endSession(sessionId) {
        return this.counselorService.endSession(sessionId);
    }
    getSessionStatus(sessionId) {
        return this.counselorService.getSessionStatus(sessionId);
    }
    getDummyReport() {
        return this.counselorService.getDummyReport();
    }
    async getTtsAudio(text, res) {
        const audioBuffer = await this.counselorService.generateTtsAudio(text);
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'public, max-age=86400',
        });
        res.send(audioBuffer);
    }
};
exports.AiCounselorController = AiCounselorController;
__decorate([
    (0, common_1.Post)('session/start'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [start_session_dto_1.StartSessionDto]),
    __metadata("design:returntype", Promise)
], AiCounselorController.prototype, "startSession", null);
__decorate([
    (0, common_1.Post)('chat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], AiCounselorController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('session/end'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiCounselorController.prototype, "endSession", null);
__decorate([
    (0, common_1.Get)('session/:sessionId/status'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiCounselorController.prototype, "getSessionStatus", null);
__decorate([
    (0, common_1.Get)('dummy-report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiCounselorController.prototype, "getDummyReport", null);
__decorate([
    (0, common_1.Get)('tts'),
    __param(0, (0, common_1.Query)('text')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AiCounselorController.prototype, "getTtsAudio", null);
exports.AiCounselorController = AiCounselorController = __decorate([
    (0, common_1.Controller)('api/v1/ai-counselor'),
    __metadata("design:paramtypes", [ai_counselor_service_1.AiCounselorService])
], AiCounselorController);
//# sourceMappingURL=ai-counselor.controller.js.map