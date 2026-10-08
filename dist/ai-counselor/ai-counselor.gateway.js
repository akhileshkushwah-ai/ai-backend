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
var AiCounselorGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiCounselorGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const ws_1 = require("ws");
const ai_counselor_service_1 = require("./ai-counselor.service");
const dummy_student_report_1 = require("./data/dummy-student-report");
const GEMINI_LIVE_WS_BASE_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const GEMINI_LIVE_MODELS = [
    'models/gemini-2.5-flash-native-audio-preview-12-2025',
    'models/gemini-2.5-flash-native-audio-preview-09-2025',
];
const VOICE_NAME = 'Aoede';
const HANDSHAKE_TIMEOUT_MS = 10000;
let AiCounselorGateway = AiCounselorGateway_1 = class AiCounselorGateway {
    constructor(counselorService) {
        this.counselorService = counselorService;
        this.logger = new common_1.Logger(AiCounselorGateway_1.name);
        this.clientGeminiSockets = new Map();
    }
    handleConnection(client) {
        this.logger.log('Client connected to Live Counselor WebSocket');
    }
    handleDisconnect(client) {
        this.logger.log('Client disconnected from Live Counselor WebSocket');
        this.closeGeminiSocket(client);
    }
    sendToClient(client, payload) {
        if (client.readyState !== ws_1.WebSocket.OPEN)
            return;
        try {
            client.send(JSON.stringify(payload));
        }
        catch (err) {
            this.logger.warn(`Failed to push event to client: ${err.message}`);
        }
    }
    closeGeminiSocket(client) {
        const geminiWs = this.clientGeminiSockets.get(client);
        this.clientGeminiSockets.delete(client);
        if (!geminiWs)
            return;
        try {
            geminiWs.removeAllListeners('close');
            geminiWs.close();
        }
        catch (_) { }
    }
    async handleStartLiveSession(client, data) {
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();
        if (!apiKey || apiKey === 'not_set') {
            this.sendToClient(client, {
                event: 'error',
                message: 'GEMINI_API_KEY is missing on the backend. Set it in aiqtest_backend/.env.',
            });
            return;
        }
        this.closeGeminiSocket(client);
        const report = dummy_student_report_1.DUMMY_STUDENT_REPORT;
        const langPref = data?.languagePreference || 'hinglish';
        const systemInstructionText = (0, ai_counselor_service_1.buildSabcqSystemInstruction)(report, langPref, ai_counselor_service_1.SABCQ_PHASES[0]);
        const lastFailure = { message: 'unknown error' };
        for (const modelName of GEMINI_LIVE_MODELS) {
            try {
                const opened = await this.openGeminiLiveSession(client, modelName, systemInstructionText, apiKey);
                if (opened) {
                    this.logger.log(`Gemini Live WS ready. model=${modelName} voice=${VOICE_NAME}`);
                    return;
                }
            }
            catch (err) {
                lastFailure.message = err.message;
                this.logger.warn(`Failed to start Gemini Live WS on model ${modelName}: ${err.message}`);
            }
        }
        this.logger.error(`All Gemini Live models failed. Last error: ${lastFailure.message}`);
        this.sendToClient(client, {
            event: 'live_ws_fallback',
            message: `Gemini Live WebSocket stream unavailable (${lastFailure.message}). Falling back to HTTP REST counselor.`,
        });
    }
    openGeminiLiveSession(client, modelName, systemInstructionText, apiKey) {
        return new Promise((resolve, reject) => {
            const geminiWs = new ws_1.WebSocket(`${GEMINI_LIVE_WS_BASE_URL}?key=${apiKey}`);
            let settled = false;
            const teardown = () => {
                clearTimeout(timeout);
                geminiWs.removeAllListeners('open');
                geminiWs.removeAllListeners('message');
                geminiWs.removeAllListeners('error');
                geminiWs.removeAllListeners('close');
            };
            const succeed = () => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timeout);
                this.clientGeminiSockets.set(client, geminiWs);
                this.sendToClient(client, {
                    event: 'live_session_started',
                    model: modelName,
                    voice: VOICE_NAME,
                    message: 'Connected to Live Gemini Realtime Voice Stream!',
                });
                resolve(true);
            };
            const fail = (message) => {
                if (settled)
                    return;
                settled = true;
                teardown();
                try {
                    geminiWs.close();
                }
                catch (_) { }
                reject(new Error(message));
            };
            const timeout = setTimeout(() => fail('Timed out waiting for Gemini setup acknowledgement'), HANDSHAKE_TIMEOUT_MS);
            geminiWs.on('open', () => {
                const setupMsg = {
                    setup: {
                        model: modelName,
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                            speechConfig: {
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
                            },
                        },
                        systemInstruction: { parts: [{ text: systemInstructionText }] },
                    },
                };
                geminiWs.send(JSON.stringify(setupMsg));
            });
            geminiWs.on('message', (rawMessage) => {
                let parsed;
                try {
                    parsed = JSON.parse(rawMessage.toString('utf-8'));
                }
                catch (_) {
                    return;
                }
                if (parsed.error) {
                    const reason = parsed.error.message || 'unknown Gemini error';
                    this.logger.warn(`Gemini Live WS rejected model ${modelName}: ${reason}`);
                    if (!this.clientGeminiSockets.has(client)) {
                        fail(reason);
                    }
                    else {
                        this.sendToClient(client, { event: 'error', message: reason });
                        this.closeGeminiSocket(client);
                    }
                    return;
                }
                if (!settled) {
                    if (parsed.setupComplete) {
                        succeed();
                    }
                    return;
                }
                this.relayServerContent(client, parsed);
            });
            geminiWs.on('error', (err) => {
                if (!settled)
                    fail(err.message);
            });
            geminiWs.on('close', (code, reasonBuffer) => {
                const reason = reasonBuffer?.toString() || '';
                if (!settled) {
                    fail(`Gemini Live WS closed before setup (code ${code}) ${reason}`.trim());
                    return;
                }
                this.logger.log(`Gemini Live WS closed (code ${code}). ${reason}`);
                this.clientGeminiSockets.delete(client);
                this.sendToClient(client, {
                    event: 'live_ws_closed',
                    message: `Gemini Live stream closed (code ${code}). ${reason}`.trim(),
                });
            });
        });
    }
    relayServerContent(client, parsed) {
        const serverContent = parsed.serverContent;
        if (!serverContent)
            return;
        const parts = serverContent.modelTurn?.parts || [];
        for (const part of parts) {
            if (part.thought === true)
                continue;
            if (part.inlineData?.data) {
                const mimeType = part.inlineData.mimeType || 'audio/pcm;rate=24000';
                this.sendToClient(client, {
                    event: 'audio_chunk',
                    data: part.inlineData.data,
                    mimeType,
                });
            }
            if (part.text) {
                this.sendToClient(client, { event: 'text_chunk', text: part.text });
            }
        }
        if (serverContent.interrupted) {
            this.sendToClient(client, { event: 'interrupted' });
        }
        if (serverContent.turnComplete) {
            this.sendToClient(client, { event: 'turn_complete' });
        }
    }
    handleAudioInput(client, data) {
        const geminiWs = this.clientGeminiSockets.get(client);
        if (geminiWs && geminiWs.readyState === ws_1.WebSocket.OPEN && data?.pcmBase64) {
            const audioMsg = {
                realtimeInput: {
                    mediaChunks: [
                        {
                            mimeType: 'audio/pcm;rate=16000',
                            data: data.pcmBase64,
                        },
                    ],
                },
            };
            try {
                geminiWs.send(JSON.stringify(audioMsg));
            }
            catch (err) {
                this.logger.warn(`Failed to forward mic chunk: ${err.message}`);
            }
        }
    }
    handleTextTurn(client, data) {
        const text = typeof data === 'string' ? data : data?.text;
        if (!text || !text.trim())
            return;
        const geminiWs = this.clientGeminiSockets.get(client);
        if (!geminiWs || geminiWs.readyState !== ws_1.WebSocket.OPEN) {
            this.sendToClient(client, {
                event: 'error',
                message: 'Live session is not connected. Start the live session before sending a message.',
            });
            return;
        }
        try {
            geminiWs.send(JSON.stringify({
                clientContent: {
                    turns: [{ role: 'user', parts: [{ text: text.trim() }] }],
                    turnComplete: true,
                },
            }));
            this.logger.log(`Forwarded text turn to Gemini live session (${text.trim().length} chars).`);
        }
        catch (err) {
            this.logger.warn(`Failed to forward text turn: ${err.message}`);
        }
    }
    handleTriggerFirstIntro(client) {
        const geminiWs = this.clientGeminiSockets.get(client);
        if (!geminiWs || geminiWs.readyState !== ws_1.WebSocket.OPEN) {
            this.sendToClient(client, {
                event: 'error',
                message: 'Live session is not connected.',
            });
            return;
        }
        const introPrompt = 'Please start the SABCQ session now by speaking the official SABCQ Grand Opening Introduction to the student as defined in your system prompt instruction.';
        try {
            geminiWs.send(JSON.stringify({
                clientContent: {
                    turns: [{ role: 'user', parts: [{ text: introPrompt }] }],
                    turnComplete: true,
                },
            }));
            this.logger.log('Triggered SABCQ Grand Opening Introduction on Gemini Live WS upon Mic interaction.');
        }
        catch (err) {
            this.logger.warn(`Failed to trigger SABCQ Intro: ${err.message}`);
        }
    }
    handleInterrupt(client) {
        const geminiWs = this.clientGeminiSockets.get(client);
        if (geminiWs && geminiWs.readyState === ws_1.WebSocket.OPEN) {
            const interruptMsg = { realtimeInput: { audioStreamEnd: true } };
            try {
                geminiWs.send(JSON.stringify(interruptMsg));
                this.logger.log('Forwarded barge-in (audioStreamEnd) to Gemini live session.');
            }
            catch (err) {
                this.logger.warn(`Failed to forward interrupt: ${err.message}`);
            }
        }
    }
};
exports.AiCounselorGateway = AiCounselorGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", ws_1.Server)
], AiCounselorGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('start_live_session'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ws_1.WebSocket, Object]),
    __metadata("design:returntype", Promise)
], AiCounselorGateway.prototype, "handleStartLiveSession", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('audio_input'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ws_1.WebSocket, Object]),
    __metadata("design:returntype", void 0)
], AiCounselorGateway.prototype, "handleAudioInput", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('text_turn'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ws_1.WebSocket, Object]),
    __metadata("design:returntype", void 0)
], AiCounselorGateway.prototype, "handleTextTurn", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('trigger_first_intro'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ws_1.WebSocket]),
    __metadata("design:returntype", void 0)
], AiCounselorGateway.prototype, "handleTriggerFirstIntro", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('interrupt'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ws_1.WebSocket]),
    __metadata("design:returntype", void 0)
], AiCounselorGateway.prototype, "handleInterrupt", null);
exports.AiCounselorGateway = AiCounselorGateway = AiCounselorGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ path: '/ws/live-counselor', cors: { origin: '*' } }),
    __metadata("design:paramtypes", [ai_counselor_service_1.AiCounselorService])
], AiCounselorGateway);
//# sourceMappingURL=ai-counselor.gateway.js.map