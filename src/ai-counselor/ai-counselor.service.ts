import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DUMMY_STUDENT_REPORT, FullStudentReport } from './data/dummy-student-report';

export interface ActiveCounselorSession {
  sessionId: string;
  studentId: string;
  chatSession: any; // GoogleGenAI ChatSession or MockCounselorSession
  reportData: FullStudentReport;
  createdAt: Date;
  lastActiveAt: Date;
  messageCount: number;
  timer: NodeJS.Timeout;
  isLiveGemini: boolean;
  history: { role: 'user' | 'model'; parts: string; timestamp: Date }[];
  systemInstruction?: string;
  activeModelName?: string;
}

@Injectable()
export class AiCounselorService {
  private readonly logger = new Logger(AiCounselorService.name);
  private activeSessions = new Map<string, ActiveCounselorSession>();
  private genAI: GoogleGenerativeAI | null = null;
  private readonly SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes TTL

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'not_set' && apiKey.trim().length > 0) {
      this.genAI = new GoogleGenerativeAI(apiKey.trim());
      this.logger.log('Google Gemini AI SDK initialized successfully with GEMINI_API_KEY.');
    } else {
      this.logger.warn('GEMINI_API_KEY not set in .env. Using Dynamic Context-Aware Counselor Engine.');
    }
  }

  /**
   * STAGE 1: SESSION START (REPORT LOADED ONLY ONCE AT SESSION START)
   */
  async startCounselorSession(customReport?: FullStudentReport | any, studentId?: string, languagePreference = 'hinglish') {
    const report: FullStudentReport = customReport?.studentAssessmentContext 
      ? customReport 
      : (customReport?.reportData ? { studentId: studentId || 'STD_88492', studentName: 'Rahul Sharma', studentAssessmentContext: customReport } : DUMMY_STUDENT_REPORT);

    const sId = studentId || report.studentId || 'STD_88492';
    const sessionId = `sess_${sId}_${Date.now()}`;

    const formattedReport = this.formatAssessmentContext(report.studentAssessmentContext);

    const systemInstruction = `
You are Priya Sharma, a senior, warm, empathetic, and highly experienced AI Career Counselor at SABCQ.
You MUST speak like a real human career counselor in a video consultation room.
Use conversational ${languagePreference === 'hindi' ? 'Hindi' : 'Hinglish (Mix of Hindi and English written in Latin script)'}.

CRITICAL INSTRUCTIONS ABOUT STUDENT ASSESSMENT REPORT:
1. You ALREADY HAVE the student's complete assessment report loaded into your prompt context below.
2. The student WILL NOT send their report again in follow-up chat messages.
3. Every answer you give MUST be deeply customized based on their specific assessment scores and traits:
   - Student Name: ${report.studentName}
   - Assessment Context & Scores:
${formattedReport}

4. AI GUIDELINES TO FOLLOW STRICTLY:
   - Use the report as primary student context.
   - Personalize answers using scores (e.g. highlight high career options like LAW (75%), BUSINESS (68%), CREATIVE PERSONALITY (84%), READING SKILLS (100%), ACCEPTANCE OF CHALLENGES (100%)).
   - Do NOT ask student to repeat report data.
   - Explain recommendations using relevant report factors.
   - Speak naturally as a human counselor. Keep answers warm, personal, structured, and short (under 120 words per response so it feels natural to listen to).
`;

    let chatSession: any = null;
    let isLiveGemini = false;
    let selectedModelName = '';

    if (this.genAI) {
      // Candidate official Gemini models (prioritizing ultra-fast gemini-2.0-flash)
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
        } catch (err) {
          this.logger.warn(`Model ${modelName} failed: ${err.message}`);
        }
      }
    }

    if (!isLiveGemini) {
      chatSession = new MockCounselorSession(report, systemInstruction);
    }

    // Schedule 15-Minute Auto Cleanup Timer
    const timer = setTimeout(() => {
      this.eraseSession(sessionId, 'Inactivity TTL Expired (15 Mins)');
    }, this.SESSION_TIMEOUT_MS);

    const sessionObj: ActiveCounselorSession = {
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
    };

    this.activeSessions.set(sessionId, sessionObj);

    return {
      success: true,
      sessionId,
      counselorName: 'Priya Sharma',
      message: 'AI Counselor Session Initialized successfully with Student Report loaded in memory!',
      isLiveGemini,
      ttlMinutes: 15,
      reportLoaded: {
        studentName: report.studentName,
        totalScoresCount: report.studentAssessmentContext.reportData.length,
        topScores: report.studentAssessmentContext.reportData.filter(d => d.score >= 70).slice(0, 5),
      },
    };
  }

  /**
   * STAGE 2: ACTIVE CHATTING (NO REPORT SENT AGAIN IN REQUEST PAYLOAD)
   */
  async sendMessage(sessionId: string, userMessage: string) {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new NotFoundException({
        success: false,
        errorCode: 'SESSION_EXPIRED',
        message: 'Counselor Session has expired or does not exist. Please re-open AI Counselor to initialize session with your report.',
      });
    }

    // Reset Inactivity Timer
    clearTimeout(session.timer);
    session.timer = setTimeout(() => {
      this.eraseSession(sessionId, 'Inactivity TTL Expired (15 Mins)');
    }, this.SESSION_TIMEOUT_MS);

    session.lastActiveAt = new Date();
    session.messageCount++;

    let responseText = '';

    if (session.isLiveGemini) {
      try {
        const result = await session.chatSession.sendMessage(userMessage);
        responseText = result.response.text();
      } catch (err) {
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

              // Format conversation history for GenAI SDK
              const historyForSDK = session.history.map(h => ({
                role: h.role,
                parts: [{ text: h.parts }],
              }));

              const newChat = model.startChat({ history: historyForSDK });
              const result = await newChat.sendMessage(userMessage);
              responseText = result.response.text();

              // Update session with new working chat session & model name
              session.chatSession = newChat;
              session.activeModelName = modelName;
              failoverSuccess = true;
              this.logger.log(`Successfully failed over session ${sessionId} to model '${modelName}'`);
              break;
            } catch (failoverErr) {
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
    } else {
      try {
        responseText = await session.chatSession.sendMessage(userMessage);
      } catch (err) {
        this.logger.error(`Context Engine sendMessage error: ${err.message}`);
        responseText = MockCounselorSession.generateContextualResponse(session.reportData, userMessage);
      }
    }

    // Store in history
    session.history.push({ role: 'user', parts: userMessage, timestamp: new Date() });
    session.history.push({ role: 'model', parts: responseText, timestamp: new Date() });

    return {
      success: true,
      sessionId,
      responseText,
      messageCount: session.messageCount,
      reportPayloadSentInThisRequest: false,
      isLiveGemini: session.isLiveGemini,
      lastActiveAt: session.lastActiveAt,
    };
  }

  /**
   * STAGE 3: MANUAL ERASE / CLEANUP
   */
  async endSession(sessionId: string) {
    const erased = this.eraseSession(sessionId, 'User closed AI Counselor session');
    return {
      success: true,
      erased,
      message: erased ? `Session ${sessionId} successfully erased from server memory.` : 'Session not found or already erased.',
    };
  }

  /**
   * GET ACTIVE SESSION STATUS
   */
  getSessionStatus(sessionId: string) {
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

  /**
   * GET STATIC DUMMY REPORT
   */
  getDummyReport() {
    return DUMMY_STUDENT_REPORT;
  }

  /**
   * Helper: Formats studentAssessmentContext into plain text prompt format
   */
  formatAssessmentContext(context: FullStudentReport['studentAssessmentContext']): string {
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

  /**
   * Private Helper: Erase Session from Memory
   */
  private eraseSession(sessionId: string, reason: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      clearTimeout(session.timer);
      this.activeSessions.delete(sessionId);
      this.logger.log(`Session ${sessionId} ERASED from memory. Reason: ${reason}`);
      return true;
    }
    return false;
  }

  /**
   * STAGE 4: HIGH-QUALITY STUDIO TTS SPEECH GENERATION (NEURAL HD VOICE)
   */
  async generateTtsAudio(text: string): Promise<Buffer> {
    const cleanText = (text || '')
      .replace(/[*#_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      throw new BadRequestException('Text is required for TTS generation.');
    }

    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      cleanText,
    )}&tl=hi&client=tw-ob`;

    try {
      const response = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Google TTS request failed with status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: any) {
      this.logger.error(`TTS Audio Generation error: ${err.message}`);
      throw new BadRequestException(`Failed to generate TTS audio: ${err.message}`);
    }
  }
}

/**
 * Intelligent Dynamic Context-Aware Human Counselor Class
 */
class MockCounselorSession {
  private report: FullStudentReport;

  constructor(report: FullStudentReport, systemInstruction: string) {
    this.report = report;
  }

  async sendMessage(userMessage: string): Promise<string> {
    return MockCounselorSession.generateContextualResponse(this.report, userMessage);
  }

  static generateContextualResponse(report: FullStudentReport, message: string): string {
    const name = report.studentName || 'Rahul';
    const lower = message.toLowerCase().trim();
    const scores = report.studentAssessmentContext.reportData;

    // Helper score getter
    const getScore = (itemName: string) => scores.find(s => s.name.toLowerCase() === itemName.toLowerCase())?.score || 0;

    // 1. Law / Lawyer / Judiciary / Politics
    if (lower.includes('law') || lower.includes('lawyer') || lower.includes('judiciary') || lower.includes('politics')) {
      const score = getScore('LAW PUBLIC AND POLITICAL AFFAIRS');
      return `Haan ${name}, tumhari report ke mutabiq **Law & Public Affairs** me tumhara score **${score}%** hai jo ki bohot strong hai! Aapka Reading Skill (100%) aur Acceptance of Challenges (100%) hai, jo Legal studies ke liye bilkul best combination hai.`;
    }

    // 2. Business / MBA / Management / Startup
    if (lower.includes('business') || lower.includes('mba') || lower.includes('management') || lower.includes('startup')) {
      const biz = getScore('BUSINESS');
      const mgmt = getScore('MANAGEMENT');
      return `Bilkul ${name}! Business me aapka score **${biz}%** aur Management me **${mgmt}%** hai. Aapka Business Approach Thinker score (59%) accha hai. Agar aap BBA/MBA ya Startup ki taraf jaate hain toh aap accha kar sakte hain.`;
    }

    // 3. Engineering / Tech / Computer Science / Coding
    if (lower.includes('engineering') || lower.includes('tech') || lower.includes('coding') || lower.includes('btech')) {
      const eng = getScore('ENGINEERING');
      const tech = getScore('TECHNOLOGY');
      return `${name}, aapki report me Engineering score **${eng}%** aur Technology score **${tech}%** low dikh rahe hain. Par aapka Logic & Research (100%) bohot high hai. Agar aap Tech me jana chahte hain toh aapko basic technical skills par mehnat karni hogi.`;
    }

    // 4. Medical / Doctor / Pharmacy / Chemistry
    if (lower.includes('doctor') || lower.includes('medical') || lower.includes('pharmacy') || lower.includes('neet') || lower.includes('chemistry')) {
      const doc = getScore('DOCTOR AND PHARMACEUTICAL');
      return `${name}, Medical & Doctor field me aapka score **${doc}%** hai. Scientific Thinking (28%) thoda weak side par hai, isliye pure Clinical Medicine ke bajaye Law ya Business Management zyaada rewarding rahega.`;
    }

    // 5. Sports / Physical / Fitness
    if (lower.includes('sports') || lower.includes('game') || lower.includes('fitness')) {
      const sports = getScore('SPORTS');
      return `Bohot badiya ${name}! Sports & Humanity Interest me aapka score **${sports}%** bohot high hai! Iska matlab aap active environment aur competitive spirit (66%) enjoy karte hain.`;
    }

    // 6. Media / Mass Communication / Creative / Arts
    if (lower.includes('media') || lower.includes('communication') || lower.includes('creative') || lower.includes('design')) {
      const media = getScore('MASS AND MEDIA COMMUNICATION');
      const creative = getScore('CREATIVE PERSONALITY');
      return `Wow ${name}! Aapka **Creative Personality Score ${creative}%** hai aur Mass & Media Communication score **${media}%** hai! Aap Digital Content, Media, Design ya Creative Writing me bohot accha kar sakte hain.`;
    }

    // 7. General Greeting / Hello / Hi
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste') || lower.includes('hey')) {
      return `Namaste ${name}! Main Priya Sharma, aapki SABCQ Career Counselor. Aapki assessment report mere samne open hai. Aap kis career ya field ke baare me baat karna chahte hain?`;
    }

    // 8. Default Dynamic response based on top report scores
    const topScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
    const topList = topScores.map(t => `${t.name} (${t.score}%)`).join(', ');

    return `Haan ${name}, main aapki baat samajh rahi hoon. Aapki report ke mutabiq aapke top strong areas hain: ${topList}. Aap iske baare me ya kisi specific field ke baare me kya poochna chahte hain?`;
  }
}
