import { AiCounselorService } from './ai-counselor.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
export declare class AiCounselorController {
    private readonly counselorService;
    constructor(counselorService: AiCounselorService);
    startSession(body: StartSessionDto): Promise<{
        success: boolean;
        sessionId: string;
        counselorName: string;
        message: string;
        isLiveGemini: boolean;
        ttlMinutes: number;
        currentPhase: import("./ai-counselor.service").SabcqPhaseInfo;
        totalPhasesCount: number;
        reportLoaded: {
            studentName: string;
            totalScoresCount: number;
            topScores: import("./data/dummy-student-report").ReportDataItem[];
        };
    }>;
    sendMessage(body: SendMessageDto): Promise<{
        success: boolean;
        sessionId: string;
        responseText: string;
        messageCount: number;
        currentPhase: import("./ai-counselor.service").SabcqPhaseInfo;
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
    getDummyReport(): import("./data/dummy-student-report").FullStudentReport;
    getTtsAudio(text: string, res: any): Promise<void>;
}
