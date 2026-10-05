import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { WebSocket, Server } from 'ws';
import { AiCounselorService } from './ai-counselor.service';
export declare class AiCounselorGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly counselorService;
    private readonly logger;
    server: Server;
    private clientGeminiSockets;
    constructor(counselorService: AiCounselorService);
    handleConnection(client: WebSocket): void;
    handleDisconnect(client: WebSocket): void;
    private sendToClient;
    private closeGeminiSocket;
    handleStartLiveSession(client: WebSocket, data: {
        studentId?: string;
        languagePreference?: string;
    }): Promise<void>;
    private openGeminiLiveSession;
    private relayServerContent;
    handleAudioInput(client: WebSocket, data: {
        pcmBase64: string;
    }): void;
    handleTextTurn(client: WebSocket, data: {
        text?: string;
    } | string): void;
    handleInterrupt(client: WebSocket): void;
}
