import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { WebSocket, Server } from 'ws';
import { AiCounselorService } from './ai-counselor.service';
import { DUMMY_STUDENT_REPORT } from './data/dummy-student-report';

// NOTE: the service path is case-sensitive and must stay lowercase
// ("generativelanguage"), otherwise Google answers the WS upgrade with HTTP 404.
const GEMINI_LIVE_WS_BASE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

// Only these models support bidiGenerateContent on the Live API.
// Plain chat models (gemini-2.0-flash / gemini-2.5-flash) are rejected with 1008.
const GEMINI_LIVE_MODELS = [
  'models/gemini-2.5-flash-native-audio-preview-12-2025',
  'models/gemini-2.5-flash-native-audio-preview-09-2025',
];

const VOICE_NAME = 'Aoede';
const HANDSHAKE_TIMEOUT_MS = 10000;

@WebSocketGateway({ path: '/ws/live-counselor', cors: { origin: '*' } })
export class AiCounselorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AiCounselorGateway.name);

  @WebSocketServer()
  server: Server;

  // Active client sockets mapped to their Gemini Live WS sessions
  private clientGeminiSockets = new Map<WebSocket, WebSocket>();

  constructor(private readonly counselorService: AiCounselorService) {}

  handleConnection(client: WebSocket) {
    this.logger.log('Client connected to Live Counselor WebSocket');
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Client disconnected from Live Counselor WebSocket');
    this.closeGeminiSocket(client);
  }

  /**
   * Safe send to the browser: never throws when the socket is already gone.
   */
  private sendToClient(client: WebSocket, payload: Record<string, unknown>): void {
    if (client.readyState !== WebSocket.OPEN) return;
    try {
      client.send(JSON.stringify(payload));
    } catch (err: any) {
      this.logger.warn(`Failed to push event to client: ${err.message}`);
    }
  }

  private closeGeminiSocket(client: WebSocket): void {
    const geminiWs = this.clientGeminiSockets.get(client);
    this.clientGeminiSockets.delete(client);
    if (!geminiWs) return;
    try {
      geminiWs.removeAllListeners('close');
      geminiWs.close();
    } catch (_) {}
  }

  @SubscribeMessage('start_live_session')
  async handleStartLiveSession(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { studentId?: string; languagePreference?: string },
  ) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey || apiKey === 'not_set') {
      this.sendToClient(client, {
        event: 'error',
        message: 'GEMINI_API_KEY is missing on the backend. Set it in aiqtest_backend/.env.',
      });
      return;
    }

    // Close any previous Gemini WS for this client
    this.closeGeminiSocket(client);

    const report = DUMMY_STUDENT_REPORT;
    const formattedReport = this.counselorService.formatAssessmentContext(
      report.studentAssessmentContext,
    );

    const langPref = data?.languagePreference || 'hinglish';
    const systemInstructionText = `
You are Priya Sharma, a senior, warm, empathetic, and highly experienced AI Career Counselor at SABCQ.
You MUST speak naturally like a real human career counselor in a 1-on-1 video call.
Speak only in conversational ${langPref === 'hindi' ? 'Hindi' : 'Hinglish (a mix of Hindi and English written in Latin script)'}. Do not use any other language.

CRITICAL INSTRUCTIONS ABOUT STUDENT ASSESSMENT REPORT:
1. Student Name: ${report.studentName}
2. You already have the complete assessment report in context. Never ask the student to repeat or re-send it.
3. Assessment Context & Scores:
${formattedReport}
4. Personalise every answer using the scores above and keep spoken answers under 40 words so it sounds like natural conversation.
    `.trim();

    const lastFailure = { message: 'unknown error' };

    for (const modelName of GEMINI_LIVE_MODELS) {
      try {
        const opened = await this.openGeminiLiveSession(client, modelName, systemInstructionText, apiKey);

        if (opened) {
          this.logger.log(`Gemini Live WS ready. model=${modelName} voice=${VOICE_NAME}`);
          return;
        }
      } catch (err: any) {
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

  /**
   * Opens the Gemini Live WS, sends `setup`, and resolves ONLY once Gemini
   * acknowledges with `setupComplete`. Rejects fast on error/early close so we
   * do not burn the full timeout on a dead model.
   */
  private openGeminiLiveSession(
    client: WebSocket,
    modelName: string,
    systemInstructionText: string,
    apiKey: string,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const geminiWs = new WebSocket(`${GEMINI_LIVE_WS_BASE_URL}?key=${apiKey}`);
      let settled = false;

      // Only used on failure: on success the message listener must stay attached
      // so server output keeps streaming to the browser.
      const teardown = () => {
        clearTimeout(timeout);
        geminiWs.removeAllListeners('open');
        geminiWs.removeAllListeners('message');
        geminiWs.removeAllListeners('error');
        geminiWs.removeAllListeners('close');
      };

      const succeed = () => {
        if (settled) return;
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

      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        teardown();
        try {
          geminiWs.close();
        } catch (_) {}
        reject(new Error(message));
      };

      const timeout = setTimeout(
        () => fail('Timed out waiting for Gemini setup acknowledgement'),
        HANDSHAKE_TIMEOUT_MS,
      );

      geminiWs.on('open', () => {
        const setupMsg = {
          setup: {
            model: modelName,
            generationConfig: {
              // Native-audio live models reject ["AUDIO","TEXT"] with 1007.
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

      geminiWs.on('message', (rawMessage: Buffer) => {
        let parsed: any;
        try {
          parsed = JSON.parse(rawMessage.toString('utf-8'));
        } catch (_) {
          return;
        }

        // Gemini rejected the session - surface the real reason instead of hanging.
        if (parsed.error) {
          const reason = parsed.error.message || 'unknown Gemini error';
          this.logger.warn(`Gemini Live WS rejected model ${modelName}: ${reason}`);
          if (!this.clientGeminiSockets.has(client)) {
            fail(reason);
          } else {
            this.sendToClient(client, { event: 'error', message: reason });
            this.closeGeminiSocket(client);
          }
          return;
        }

        // Gate "connected" on the real setup acknowledgement.
        if (!settled) {
          if (parsed.setupComplete) {
            succeed();
          }
          return;
        }

        this.relayServerContent(client, parsed);
      });

      geminiWs.on('error', (err) => {
        if (!settled) fail(err.message);
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

  /**
   * Forwards Gemini server output (24kHz PCM audio + text) to the browser.
   */
  private relayServerContent(client: WebSocket, parsed: any): void {
    const serverContent = parsed.serverContent;
    if (!serverContent) return;

    const parts = serverContent.modelTurn?.parts || [];
    for (const part of parts) {
      // `thought` parts are the model's internal reasoning - never surface those.
      if (part.thought === true) continue;

      if (part.inlineData?.data) {
        const mimeType: string = part.inlineData.mimeType || 'audio/pcm;rate=24000';
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

  @SubscribeMessage('audio_input')
  handleAudioInput(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { pcmBase64: string },
  ) {
    const geminiWs = this.clientGeminiSockets.get(client);
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN && data?.pcmBase64) {
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
      } catch (err: any) {
        this.logger.warn(`Failed to forward mic chunk: ${err.message}`);
      }
    }
  }

  /**
   * Typed messages join the SAME live voice session instead of falling back to
   * the HTTP REST endpoint, so the counselor keeps one continuous conversation.
   */
  @SubscribeMessage('text_turn')
  handleTextTurn(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: { text?: string } | string,
  ) {
    const text = typeof data === 'string' ? data : data?.text;
    if (!text || !text.trim()) return;

    const geminiWs = this.clientGeminiSockets.get(client);
    if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) {
      this.sendToClient(client, {
        event: 'error',
        message: 'Live session is not connected. Start the live session before sending a message.',
      });
      return;
    }

    try {
      geminiWs.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: text.trim() }] }],
            turnComplete: true,
          },
        }),
      );
      this.logger.log(`Forwarded text turn to Gemini live session (${text.trim().length} chars).`);
    } catch (err: any) {
      this.logger.warn(`Failed to forward text turn: ${err.message}`);
    }
  }

  @SubscribeMessage('interrupt')
  handleInterrupt(@ConnectedSocket() client: WebSocket) {
    const geminiWs = this.clientGeminiSockets.get(client);
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      // NOTE: `{ clientContent: { turns: [], turnComplete: true } }` looks like the
      // obvious way to interrupt, but the Live API rejects it with close code 1007
      // as soon as a `realtimeInput.mediaChunks` audio stream is in flight, which
      // tears down the whole conversation. `audioStreamEnd` is the accepted way to
      // end the current input turn; native-audio barge-in then takes over via VAD.
      const interruptMsg = { realtimeInput: { audioStreamEnd: true } };
      try {
        geminiWs.send(JSON.stringify(interruptMsg));
        this.logger.log('Forwarded barge-in (audioStreamEnd) to Gemini live session.');
      } catch (err: any) {
        this.logger.warn(`Failed to forward interrupt: ${err.message}`);
      }
    }
  }
}
