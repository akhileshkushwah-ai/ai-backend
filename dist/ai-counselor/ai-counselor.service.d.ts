import { FullStudentReport } from './data/dummy-student-report';
export interface SabcqPhaseInfo {
    id: string;
    phaseNumber: number;
    name: string;
    durationMinutes: string;
    focus: string;
}
export declare const SABCQ_PHASES: SabcqPhaseInfo[];
export interface ActiveCounselorSession {
    sessionId: string;
    studentId: string;
    chatSession: any;
    reportData: FullStudentReport;
    createdAt: Date;
    lastActiveAt: Date;
    messageCount: number;
    timer: NodeJS.Timeout;
    isLiveGemini: boolean;
    history: {
        role: 'user' | 'model';
        parts: string;
        timestamp: Date;
    }[];
    systemInstruction?: string;
    activeModelName?: string;
    currentPhaseIndex: number;
    currentPhase: SabcqPhaseInfo;
    phaseTurnCount: number;
}
export declare function buildSabcqSystemInstruction(report: FullStudentReport, languagePreference?: string, currentPhase?: SabcqPhaseInfo): string;
export declare class AiCounselorService {
    private readonly logger;
    private activeSessions;
    private genAI;
    private readonly SESSION_TIMEOUT_MS;
    constructor();
    startCounselorSession(customReport?: FullStudentReport | any, studentId?: string, languagePreference?: string): Promise<{
        success: boolean;
        sessionId: string;
        counselorName: string;
        message: string;
        isLiveGemini: boolean;
        ttlMinutes: number;
        currentPhase: SabcqPhaseInfo;
        totalPhasesCount: number;
        reportLoaded: {
            studentName: string;
            totalScoresCount: number;
            topScores: import("./data/dummy-student-report").ReportDataItem[];
        };
    }>;
    sendMessage(sessionId: string, userMessage: string): Promise<{
        success: boolean;
        sessionId: string;
        responseText: string;
        messageCount: number;
        currentPhase: SabcqPhaseInfo;
        totalPhasesCount: number;
        reportPayloadSentInThisRequest: boolean;
        isLiveGemini: boolean;
        lastActiveAt: Date;
    }>;
    endSession(sessionId: string): Promise<{
        success: boolean;
        erased: boolean;
        message: string;
    }>;
    getSessionStatus(sessionId: string): {
        active: boolean;
        message: string;
        sessionId?: undefined;
        studentId?: undefined;
        isLiveGemini?: undefined;
        messageCount?: undefined;
        createdAt?: undefined;
        lastActiveAt?: undefined;
        idleSeconds?: undefined;
        ttlRemainingSeconds?: undefined;
        reportInMemory?: undefined;
    } | {
        active: boolean;
        sessionId: string;
        studentId: string;
        isLiveGemini: boolean;
        messageCount: number;
        createdAt: Date;
        lastActiveAt: Date;
        idleSeconds: number;
        ttlRemainingSeconds: number;
        reportInMemory: {
            studentName: string;
            totalScores: number;
        };
        message?: undefined;
    };
    getDummyReport(): FullStudentReport;
    formatAssessmentContext(context: FullStudentReport['studentAssessmentContext']): string;
    private eraseSession;
    generateTtsAudio(text: string): Promise<Buffer>;
}
