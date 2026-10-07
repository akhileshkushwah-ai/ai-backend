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
var AiCounselorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiCounselorService = exports.SABCQ_PHASES = void 0;
exports.buildSabcqSystemInstruction = buildSabcqSystemInstruction;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
const dummy_student_report_1 = require("./data/dummy-student-report");
exports.SABCQ_PHASES = [
    {
        id: 'PHASE_1_INTRO',
        phaseNumber: 1,
        name: 'Introduction & Counseling Setup',
        durationMinutes: '2 Mins',
        focus: 'Welcome student, introduce SABCQ Student Cognitive Pattern Program philosophy, outline 6-phase transformational roadmap, ensure student comfort and interactive consent.',
    },
    {
        id: 'PHASE_2_ACADEMIC',
        phaseNumber: 2,
        name: 'Academic Profile & Learning Foundations',
        durationMinutes: '15 Mins',
        focus: 'Analyze Reading Skills, Neuro-Read (65 WPM, Comprehension 100%, Retention 60%), Concentration (Visual 88%, Auditory 100%, Kinesthetic 94%, Overall 47%), Memory (Short/Long/Visual/Auditory), Calculation (20%), Grasping (26%), and Study Potential.',
    },
    {
        id: 'PHASE_3_BEHAVIOUR',
        phaseNumber: 3,
        name: 'Behaviour Analysis & Mindset Pattern',
        durationMinutes: '8 Mins',
        focus: 'Analyze Sincerity (100%), Amiable (90%), Extraversion (90%), Diligence (70%), Participation (38%), Hesitation (67%), Inquisitiveness (62%), Neuroticism (53%), and Independent Decision Making.',
    },
    {
        id: 'PHASE_4_SKILL',
        phaseNumber: 4,
        name: 'Skill Profile & Real-World Application',
        durationMinutes: '7 Mins',
        focus: 'Analyze Analytical Skills (96%), Convincing (90%), Leadership (82%), Innovation (75%), Communication (48%), Time Management (46%), Problem Solving (53%), and Managerial Skills (44%).',
    },
    {
        id: 'PHASE_5_IMPROVEMENT',
        phaseNumber: 5,
        name: 'Personal Improvement Plan & SABCQ Tools',
        durationMinutes: '7 Mins',
        focus: 'Practical actions: Neuro-Read 30-day practice, Neuro-Concentration time-blocking, Neuro-Memory active recall cycle (Read -> Understand -> Recall -> Revise -> Recall Again), Habit Tracker & Skill Tracker.',
    },
    {
        id: 'PHASE_6_CAREER',
        phaseNumber: 6,
        name: 'Career Direction & 30-Day Exploration Roadmap',
        durationMinutes: '5 Mins',
        focus: 'Present current profile fit (Management / Law / Tech) as an age-appropriate direction to explore (NOT a final decision), connect report strengths to 30-day exploration roadmap & tools.',
    },
    {
        id: 'PHASE_7_CLOSING',
        phaseNumber: 7,
        name: 'Closing & Next 3 Immediate Actions',
        durationMinutes: '1 Min',
        focus: 'Reiterate Day 1 vs Day 30 growth mindset, confirm student top 3 action items for tomorrow, final inspiring sign-off ("One right decision can lead you towards your fortune...").',
    },
];
function buildSabcqSystemInstruction(report, languagePreference = 'hinglish', currentPhase = exports.SABCQ_PHASES[0]) {
    const context = report.studentAssessmentContext;
    const reportLines = context.reportData
        .map(item => `- ${item.name} (${item.section}): Score ${item.score}%${item.category ? ` [${item.category}]` : ''}`)
        .join('\n');
    const testLines = context.testReport
        .map(item => `- ${item.name}: Score ${item.score}`)
        .join('\n');
    return `
You are Priya Sharma, a senior, warm, empathetic, and highly experienced AI Career Counselor at SABCQ.
You MUST speak naturally like a real human career counselor conducting a transformational 45-minute 1-on-1 video consultation room.
Use conversational ${languagePreference === 'hindi' ? 'Hindi' : 'Hinglish (Mix of Hindi and English written in Latin script)'}.

CRITICAL SABCQ COUNSELING PHILOSOPHY & MANDATES (CLIENT TRAINING PROTOCOL):
1. SABCQ is a Student Cognitive Pattern Program. NEVER treat scores as fixed permanent labels or verdicts.
2. DO NOT use negative words like "weak", "lazy", or "poor". Use positive constructive phrasing like "needs practice right now", "area for growth", or "opportunity to develop".
3. Use the student's report as visual evidence. Do NOT read every score aloud monotonously. Always connect scores to real-life student experiences.
4. RESPONSE LENGTH & STRUCTURE (STRICT MANDATE):
   - Every response MUST be comprehensive, structured, warm, and detailed (target: 150 to 250 words per response). NEVER give abrupt 1-2 line short replies!
   - EVERY TOPIC RESPONSE MUST FOLLOW THIS 4-STEP SABCQ COUNSELING FRAMEWORK:
     * STEP 1 [STRENGTH]: Acknowledge what is already working well.
     * STEP 2 [MEANING]: Explain why this ability matters in daily studies, real life, or career.
     * STEP 3 [GAP/AREA TO WORK]: Identify the key area needing attention with empathy.
     * STEP 4 [ACTION & SABCQ TOOL]: Provide 1 practical next step and recommend relevant SABCQ Tools (Neuro-Read, Neuro-Concentration, Neuro-Memory, Habit Tracker, Skill Tracker, Neuro-Bricks).
   - END EVERY RESPONSE WITH 1 WARM, INTERACTIVE REFLECTIVE QUESTION to keep the student engaged.

STUDENT PROFILE & ASSESSMENT CONTEXT:
- Student Name: ${report.studentName}
- Grade/Class: ${report.grade || '11th Standard'} • Stream: ${report.stream || 'Commerce'}
- Context & Report Scores:
--- SECTION SCORES ---
${reportLines}

--- TEST SCORES ---
${testLines}

CURRENT SABCQ COUNSELING SESSION PHASE (${currentPhase.phaseNumber}/7):
- Phase Name: ${currentPhase.name} (${currentPhase.durationMinutes})
- Phase Agenda & Focus: ${currentPhase.focus}

GUIDE THE STUDENT THROUGH THIS PHASE NATURALLY. WHEN STUDENT ANSWERS OR ASKS A QUESTION, RESPOND DEEPLY USING THE 4-STEP FRAMEWORK.
`.trim();
}
let AiCounselorService = AiCounselorService_1 = class AiCounselorService {
    constructor() {
        this.logger = new common_1.Logger(AiCounselorService_1.name);
        this.activeSessions = new Map();
        this.genAI = null;
        this.SESSION_TIMEOUT_MS = 15 * 60 * 1000;
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== 'not_set' && apiKey.trim().length > 0) {
            this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey.trim());
            this.logger.log('Google Gemini AI SDK initialized successfully with GEMINI_API_KEY.');
        }
        else {
            this.logger.warn('GEMINI_API_KEY not set in .env. Using Dynamic Context-Aware Counselor Engine.');
        }
    }
    async startCounselorSession(customReport, studentId, languagePreference = 'hinglish') {
        const report = customReport?.studentAssessmentContext
            ? customReport
            : (customReport?.reportData ? { studentId: studentId || 'STD_88492', studentName: 'Rahul Sharma', studentAssessmentContext: customReport } : dummy_student_report_1.DUMMY_STUDENT_REPORT);
        const sId = studentId || report.studentId || 'STD_88492';
        const sessionId = `sess_${sId}_${Date.now()}`;
        const initialPhase = exports.SABCQ_PHASES[0];
        const systemInstruction = buildSabcqSystemInstruction(report, languagePreference, initialPhase);
        let chatSession = null;
        let isLiveGemini = false;
        let selectedModelName = '';
        if (this.genAI) {
            const candidateModels = [
                'gemini-2.0-flash',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
            ];
            for (const modelName of candidateModels) {
                try {
                    const model = this.genAI.getGenerativeModel({
                        model: modelName,
                        systemInstruction: systemInstruction,
                    });
                    chatSession = model.startChat({ history: [] });
                    isLiveGemini = true;
                    selectedModelName = modelName;
                    this.logger.log(`Created Live Gemini ChatSession using model '${modelName}' for sessionId: ${sessionId}`);
                    break;
                }
                catch (err) {
                    this.logger.warn(`Model ${modelName} failed: ${err.message}`);
                }
            }
        }
        if (!isLiveGemini) {
            chatSession = new MockCounselorSession(report, systemInstruction);
        }
        const timer = setTimeout(() => {
            this.eraseSession(sessionId, 'Inactivity TTL Expired (15 Mins)');
        }, this.SESSION_TIMEOUT_MS);
        const sessionObj = {
            sessionId,
            studentId: sId,
            chatSession,
            reportData: report,
            createdAt: new Date(),
            lastActiveAt: new Date(),
            messageCount: 0,
            timer,
            isLiveGemini,
            history: [],
            systemInstruction,
            activeModelName: selectedModelName,
            currentPhaseIndex: 0,
            currentPhase: initialPhase,
            phaseTurnCount: 0,
        };
        this.activeSessions.set(sessionId, sessionObj);
        return {
            success: true,
            sessionId,
            counselorName: 'Priya Sharma',
            message: 'AI Counselor Session Initialized successfully with SABCQ 45-Minute Master Protocol!',
            isLiveGemini,
            ttlMinutes: 15,
            currentPhase: initialPhase,
            totalPhasesCount: exports.SABCQ_PHASES.length,
            reportLoaded: {
                studentName: report.studentName,
                totalScoresCount: report.studentAssessmentContext.reportData.length,
                topScores: report.studentAssessmentContext.reportData.filter(d => d.score >= 70).slice(0, 5),
            },
        };
    }
    async sendMessage(sessionId, userMessage) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new common_1.NotFoundException({
                success: false,
                errorCode: 'SESSION_EXPIRED',
                message: 'Counselor Session has expired or does not exist. Please re-open AI Counselor to initialize session with your report.',
            });
        }
        clearTimeout(session.timer);
        session.timer = setTimeout(() => {
            this.eraseSession(sessionId, 'Inactivity TTL Expired (15 Mins)');
        }, this.SESSION_TIMEOUT_MS);
        session.lastActiveAt = new Date();
        session.messageCount++;
        session.phaseTurnCount++;
        let targetPhaseIndex = 0;
        if (session.messageCount <= 1)
            targetPhaseIndex = 0;
        else if (session.messageCount <= 5)
            targetPhaseIndex = 1;
        else if (session.messageCount <= 8)
            targetPhaseIndex = 2;
        else if (session.messageCount <= 11)
            targetPhaseIndex = 3;
        else if (session.messageCount <= 14)
            targetPhaseIndex = 4;
        else if (session.messageCount <= 17)
            targetPhaseIndex = 5;
        else
            targetPhaseIndex = 6;
        if (targetPhaseIndex !== session.currentPhaseIndex && exports.SABCQ_PHASES[targetPhaseIndex]) {
            session.currentPhaseIndex = targetPhaseIndex;
            session.currentPhase = exports.SABCQ_PHASES[targetPhaseIndex];
            session.phaseTurnCount = 1;
            this.logger.log(`Session ${sessionId} advanced to SABCQ Phase ${session.currentPhase.phaseNumber}: ${session.currentPhase.name}`);
        }
        let responseText = '';
        if (session.isLiveGemini) {
            try {
                const result = await session.chatSession.sendMessage(userMessage);
                responseText = result.response.text();
            }
            catch (err) {
                this.logger.warn(`Gemini live chat on model '${session.activeModelName || 'primary'}' failed (${err.message}). Attempting failover to alternative models...`);
                let failoverSuccess = false;
                if (this.genAI) {
                    const candidateFailoverModels = [
                        'gemini-2.0-flash',
                        'gemini-1.5-flash',
                        'gemini-1.5-pro',
                    ].filter(m => m !== session.activeModelName);
                    for (const modelName of candidateFailoverModels) {
                        try {
                            const model = this.genAI.getGenerativeModel({
                                model: modelName,
                                systemInstruction: session.systemInstruction,
                            });
                            const historyForSDK = session.history.map(h => ({
                                role: h.role,
                                parts: [{ text: h.parts }],
                            }));
                            const newChat = model.startChat({ history: historyForSDK });
                            const result = await newChat.sendMessage(userMessage);
                            responseText = result.response.text();
                            session.chatSession = newChat;
                            session.activeModelName = modelName;
                            failoverSuccess = true;
                            this.logger.log(`Successfully failed over session ${sessionId} to model '${modelName}'`);
                            break;
                        }
                        catch (failoverErr) {
                            this.logger.warn(`Failover model ${modelName} failed: ${failoverErr.message}`);
                        }
                    }
                }
                if (!failoverSuccess) {
                    this.logger.error(`All live Gemini models failed or experienced 503 high demand. Gracefully switching session to Dynamic Context Engine.`);
                    session.isLiveGemini = false;
                    session.chatSession = new MockCounselorSession(session.reportData, session.systemInstruction || '');
                    responseText = MockCounselorSession.generateContextualResponse(session.reportData, userMessage);
                }
            }
        }
        else {
            try {
                responseText = await session.chatSession.sendMessage(userMessage);
            }
            catch (err) {
                this.logger.error(`Context Engine sendMessage error: ${err.message}`);
                responseText = MockCounselorSession.generateContextualResponse(session.reportData, userMessage);
            }
        }
        session.history.push({ role: 'user', parts: userMessage, timestamp: new Date() });
        session.history.push({ role: 'model', parts: responseText, timestamp: new Date() });
        return {
            success: true,
            sessionId,
            responseText,
            messageCount: session.messageCount,
            currentPhase: session.currentPhase,
            totalPhasesCount: exports.SABCQ_PHASES.length,
            reportPayloadSentInThisRequest: false,
            isLiveGemini: session.isLiveGemini,
            lastActiveAt: session.lastActiveAt,
        };
    }
    async endSession(sessionId) {
        const erased = this.eraseSession(sessionId, 'User closed AI Counselor session');
        return {
            success: true,
            erased,
            message: erased ? `Session ${sessionId} successfully erased from server memory.` : 'Session not found or already erased.',
        };
    }
    getSessionStatus(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return { active: false, message: 'Session inactive or erased' };
        }
        const idleSeconds = Math.round((Date.now() - session.lastActiveAt.getTime()) / 1000);
        const ttlRemainingSeconds = Math.max(0, Math.round(this.SESSION_TIMEOUT_MS / 1000 - idleSeconds));
        return {
            active: true,
            sessionId: session.sessionId,
            studentId: session.studentId,
            isLiveGemini: session.isLiveGemini,
            messageCount: session.messageCount,
            createdAt: session.createdAt,
            lastActiveAt: session.lastActiveAt,
            idleSeconds,
            ttlRemainingSeconds,
            reportInMemory: {
                studentName: session.reportData.studentName,
                totalScores: session.reportData.studentAssessmentContext.reportData.length,
            },
        };
    }
    getDummyReport() {
        return dummy_student_report_1.DUMMY_STUDENT_REPORT;
    }
    formatAssessmentContext(context) {
        const reportLines = context.reportData
            .map(item => `- ${item.name} (${item.section}): Score ${item.score}${item.category ? ` [${item.category}]` : ''}`)
            .join('\n');
        const testLines = context.testReport
            .map(item => `- ${item.name}: Score ${item.score}`)
            .join('\n');
        return `
--- SECTION SCORES ---
${reportLines}

--- TEST SCORES ---
${testLines}
    `.trim();
    }
    eraseSession(sessionId, reason) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            clearTimeout(session.timer);
            this.activeSessions.delete(sessionId);
            this.logger.log(`Session ${sessionId} ERASED from memory. Reason: ${reason}`);
            return true;
        }
        return false;
    }
    async generateTtsAudio(text) {
        const cleanText = (text || '')
            .replace(/[*#_`~]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleanText) {
            throw new common_1.BadRequestException('Text is required for TTS generation.');
        }
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=hi&client=tw-ob`;
        try {
            const response = await fetch(googleTtsUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });
            if (!response.ok) {
                throw new Error(`Google TTS request failed with status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (err) {
            this.logger.error(`TTS Audio Generation error: ${err.message}`);
            throw new common_1.BadRequestException(`Failed to generate TTS audio: ${err.message}`);
        }
    }
};
exports.AiCounselorService = AiCounselorService;
exports.AiCounselorService = AiCounselorService = AiCounselorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiCounselorService);
class MockCounselorSession {
    constructor(report, systemInstruction) {
        this.report = report;
    }
    async sendMessage(userMessage) {
        return MockCounselorSession.generateContextualResponse(this.report, userMessage);
    }
    static generateContextualResponse(report, message) {
        const name = report.studentName || 'Rahul';
        const lower = message.toLowerCase().trim();
        const scores = report.studentAssessmentContext.reportData;
        const getScore = (itemName) => scores.find(s => s.name.toLowerCase() === itemName.toLowerCase())?.score || 0;
        if (lower.includes('law') || lower.includes('lawyer') || lower.includes('judiciary') || lower.includes('politics')) {
            const score = getScore('LAW PUBLIC AND POLITICAL AFFAIRS');
            return `Haan ${name}, tumhari report ke mutabiq **Law & Public Affairs** me tumhara score **${score}%** hai jo ki bohot strong hai! Aapka Reading Skill (100%) aur Acceptance of Challenges (100%) hai, jo Legal studies ke liye bilkul best combination hai.`;
        }
        if (lower.includes('business') || lower.includes('mba') || lower.includes('management') || lower.includes('startup')) {
            const biz = getScore('BUSINESS');
            const mgmt = getScore('MANAGEMENT');
            return `Bilkul ${name}! Business me aapka score **${biz}%** aur Management me **${mgmt}%** hai. Aapka Business Approach Thinker score (59%) accha hai. Agar aap BBA/MBA ya Startup ki taraf jaate hain toh aap accha kar sakte hain.`;
        }
        if (lower.includes('engineering') || lower.includes('tech') || lower.includes('coding') || lower.includes('btech')) {
            const eng = getScore('ENGINEERING');
            const tech = getScore('TECHNOLOGY');
            return `${name}, aapki report me Engineering score **${eng}%** aur Technology score **${tech}%** low dikh rahe hain. Par aapka Logic & Research (100%) bohot high hai. Agar aap Tech me jana chahte hain toh aapko basic technical skills par mehnat karni hogi.`;
        }
        if (lower.includes('doctor') || lower.includes('medical') || lower.includes('pharmacy') || lower.includes('neet') || lower.includes('chemistry')) {
            const doc = getScore('DOCTOR AND PHARMACEUTICAL');
            return `${name}, Medical & Doctor field me aapka score **${doc}%** hai. Scientific Thinking (28%) thoda weak side par hai, isliye pure Clinical Medicine ke bajaye Law ya Business Management zyaada rewarding rahega.`;
        }
        if (lower.includes('sports') || lower.includes('game') || lower.includes('fitness')) {
            const sports = getScore('SPORTS');
            return `Bohot badiya ${name}! Sports & Humanity Interest me aapka score **${sports}%** bohot high hai! Iska matlab aap active environment aur competitive spirit (66%) enjoy karte hain.`;
        }
        if (lower.includes('media') || lower.includes('communication') || lower.includes('creative') || lower.includes('design')) {
            const media = getScore('MASS AND MEDIA COMMUNICATION');
            const creative = getScore('CREATIVE PERSONALITY');
            return `Wow ${name}! Aapka **Creative Personality Score ${creative}%** hai aur Mass & Media Communication score **${media}%** hai! Aap Digital Content, Media, Design ya Creative Writing me bohot accha kar sakte hain.`;
        }
        if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste') || lower.includes('hey')) {
            return `Namaste ${name}! Main Priya Sharma, aapki SABCQ Career Counselor. Aapki assessment report mere samne open hai. Aap kis career ya field ke baare me baat karna chahte hain?`;
        }
        const topScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
        const topList = topScores.map(t => `${t.name} (${t.score}%)`).join(', ');
        return `Haan ${name}, main aapki baat samajh rahi hoon. Aapki report ke mutabiq aapke top strong areas hain: ${topList}. Aap iske baare me ya kisi specific field ke baare me kya poochna chahte hain?`;
    }
}
//# sourceMappingURL=ai-counselor.service.js.map