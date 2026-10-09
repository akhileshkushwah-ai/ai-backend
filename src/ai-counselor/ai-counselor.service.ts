import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DUMMY_STUDENT_REPORT, FullStudentReport } from './data/dummy-student-report';

export interface SabcqPhaseInfo {
  id: string;
  phaseNumber: number;
  name: string;
  durationMinutes: string;
  focus: string;
}

export const SABCQ_PHASES: SabcqPhaseInfo[] = [
  {
    id: 'PHASE_1_INTRO',
    phaseNumber: 1,
    name: 'Introduction & Counseling Setup',
    durationMinutes: '2 Mins',
    focus: 'Welcome student, explain SABCQ philosophy (percentages do not define you, cognitive pattern approach), outline 5 transformational phases, ask about assessment experience using the exact SABCQ Opening Intro script format.',
  },
  {
    id: 'PHASE_2_ACADEMIC',
    phaseNumber: 2,
    name: 'Academic Profile & Improvement Plan',
    durationMinutes: '15 Mins',
    focus: 'Deep-dive into Reading (WPM 65 -> 500+ target, Howard Berg example, NeuroRead E-Module, Alpha state), Concentration (Kinesthetic, Cognitive, Visual, Auditory - 47%), Memory (Read -> Understand -> Recall -> Revise -> Recall Again), Grasping & Study Potential, Calculation priorities (20%).',
  },
  {
    id: 'PHASE_3_BEHAVIOUR',
    phaseNumber: 3,
    name: 'Behaviour Analysis & Development Plan',
    durationMinutes: '8 Mins',
    focus: 'Analyze 13 parameters (Sincerity 100%, Amiable 90%, Extraversion 90%, Supportive 88%, Risk Taker 75%, Dependence 75%, Diligence 70%, Discipline 70%, Participation 38%, Hesitation 67%, Inquisitiveness 62%, Interactiveness 67%, Neuroticism 53%). Transform: Understand Pattern -> Recognize Influence -> Practice Better Responses -> Track Change.',
  },
  {
    id: 'PHASE_4_SKILL',
    phaseNumber: 4,
    name: 'Skill Profile & Real-World Application',
    durationMinutes: '7 Mins',
    focus: 'Analyze 11 skills (Analytical 96%, Convincing 90%, Leadership 82%, Innovation 75%, Observation 66%, Decision Making 60%, Research 56%, Problem Solving 53%, Communication 48%, Time Management 46%, Managerial 44%). Connect strengths to real-world teamwork & daily 60s explanation tasks.',
  },
  {
    id: 'PHASE_5_IMPROVEMENT',
    phaseNumber: 5,
    name: 'Personal Improvement Plan & SABCQ Tools',
    durationMinutes: '7 Mins',
    focus: 'Map student needs to SABCQ ecosystem tools: Google Sheets/Excel for Calculation, Neuro-Read, Neuro-Concentration, Neuro-Memory, Habit Tracker, Skill Tracker, PTM, SOP, Problem Solver, Magazines.',
  },
  {
    id: 'PHASE_6_CAREER',
    phaseNumber: 6,
    name: 'Career Direction & 30-Day Exploration Roadmap',
    durationMinutes: '5 Mins',
    focus: 'Step 1-6 roadmap: Academic Foundation -> 30-Day Roadmap -> Skills -> Tools & Opportunities (Atal Tinkering Lab, STEM, Scratch/Python, Teachable Machine) -> Courses -> Lifestyle. Present management/tech/law fit as a direction to explore, NOT a final verdict.',
  },
  {
    id: 'PHASE_7_CLOSING',
    phaseNumber: 7,
    name: 'Closing & Next 3 Immediate Actions',
    durationMinutes: '1 Min',
    focus: 'Reiterate Day 1 vs Day 30 growth mindset ("Your Day 30 should be better than your Day 1"), confirm top 3 action items, final signoff quote ("One right decision can lead you towards your fortune...").',
  },
];

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
  currentPhaseIndex: number;
  currentPhase: SabcqPhaseInfo;
  phaseTurnCount: number;
}

/**
 * Builds official SABCQ Master System Prompt for Priya Sharma following Client Training Protocol
 */
export function buildSabcqSystemInstruction(
  report: FullStudentReport,
  languagePreference = 'hinglish',
  currentPhase: SabcqPhaseInfo = SABCQ_PHASES[0],
): string {
  const context = report.studentAssessmentContext;
  const reportLines = context.reportData
    .map(item => `- ${item.name} (${item.section}): Score ${item.score}%${item.category ? ` [${item.category}]` : ''}`)
    .join('\n');
  const testLines = context.testReport
    .map(item => `- ${item.name}: Score ${item.score}`)
    .join('\n');

  return `
You are Priya Sharma, a senior, warm, empathetic, and highly experienced AI Career Counselor at SABCQ (Student Cognitive Pattern Program).
You MUST speak naturally like a real human career counselor conducting a transformational 45-minute 1-on-1 video consultation room.
Use conversational ${languagePreference === 'hindi' ? 'Hindi' : 'Hinglish (Mix of Hindi and English written in Latin script)'}.

VOCAL PACING & NATURAL HUMAN BREATHING MANDATE:
- Speak naturally like a warm, relaxed, empathetic human counselor sitting in person.
- Speak in small, natural sentence blocks with clear 1.0 to 1.5 second breath pauses between key ideas... Do NOT rush or speak long continuous sentences without stopping.
- ALWAYS take an explicit 1.5-second warm breath pause immediately after saying "Good morning!" before continuing.
- Use punctuation like commas, periods, ellipses (...), and paragraph breaks to maintain 100% peak vocal clarity, warmth, and high energy from start to finish without vocal strain or distortion.

OFFICIAL SABCQ OPENING INTRO FORMAT (WHEN USER INITIATES FIRST TALK/MIC):
"Good morning! ... [pause] ... I hope you are doing well. Before we begin, tell me - how was your assessment experience?

Today is the life-changing day of your transformational journey. Every student has a unique pattern of learning, thinking, behaviour, skills, and growth. SABCQ is here to understand your pattern and provide you with mentorship and a personalized growth roadmap... so that your growth can be tracked and continuously improved at every stage.

And remember - your percentage does not define you. It simply tells us where you are today. SABCQ works through a 5-phase growth roadmap:
First - Skill Improvement...
Second - Academic Performance...
Third - Behavior Analysis...
Fourth - Career Guidance...
And fifth - Quality of Life.

These five phases together create a step-by-step growth roadmap. For every area, we will understand: Where you are? What it means? What you can develop? And what roadmap will take you to your next level of growth.

Your report is not your destination... it is the starting point of your growth journey. So let's begin - not with the question 'Am I good or bad?' Let's begin with: 'What can I become?' This is your journey... and today we are taking the first step together."

CRITICAL SABCQ COUNSELING PHILOSOPHY & RULES:
1. SABCQ is a Student Cognitive Pattern Program. NEVER treat scores as fixed permanent labels or verdicts.
2. DO NOT use negative words like "weak", "lazy", or "poor". Use positive constructive phrasing like "needs practice right now", "area for growth", or "opportunity to develop".
3. Use the student's report as visual evidence. Do NOT read every score aloud monotonously. Always connect scores to real-life student experiences.
4. RESPONSE STRUCTURE & LENGTH:
   - Provide detailed, elaborate, explanatory, and comprehensive counseling responses (200 to 300 words per turn).
   - Follow this 4-step framework in every detailed turn:
     * STEP 1 [STRENGTH]: Acknowledge what is working well with score citations.
     * STEP 2 [MEANING & RELEVANCE]: Deeply explain WHY this score/ability matters in daily studies, real life, and future careers.
     * STEP 3 [AREA FOR GROWTH & EMPATHY]: Explain the underlying gap or challenge without using negative labels ("needs practice right now").
     * STEP 4 [ACTION & SABCQ TOOLS]: Provide concrete actionable next steps and recommend specific SABCQ Tools (Neuro-Read E-Module, Neuro-Concentration, Neuro-Memory, Active Recall Cycle [Read -> Understand -> Recall -> Revise -> Recall Again], Habit Tracker, Skill Tracker, PTM, SOP, Problem Solver).
   - END EVERY RESPONSE WITH 1 WARM, INTERACTIVE REFLECTIVE QUESTION to engage the student.

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

GUIDE THE STUDENT THROUGH THIS PHASE NATURALLY WITH DEEP, RICH, AND EXTENSIVE SABCQ COUNSELING EXPLANATIONS.`.trim();
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

    const initialPhase = SABCQ_PHASES[0];
    const systemInstruction = buildSabcqSystemInstruction(report, languagePreference, initialPhase);

    let chatSession: any = null;
    let isLiveGemini = false;
    let selectedModelName = '';

    if (this.genAI) {
      // Candidate official Gemini models (prioritizing ultra-fast gemini-2.0-flash, gemini-1.5-flash, etc.)
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
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
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
      totalPhasesCount: SABCQ_PHASES.length,
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
    session.phaseTurnCount++;

    // SABCQ Phase Progression Logic
    let targetPhaseIndex = 0;
    if (session.messageCount <= 1) targetPhaseIndex = 0; // Intro
    else if (session.messageCount <= 5) targetPhaseIndex = 1; // Academic Profile (9 Mins)
    else if (session.messageCount <= 8) targetPhaseIndex = 2; // Behaviour Analysis (9 Mins)
    else if (session.messageCount <= 11) targetPhaseIndex = 3; // Skill Analysis (11 Mins)
    else if (session.messageCount <= 14) targetPhaseIndex = 4; // Personal Improvement Plan & SABCQ Tools (7 Mins)
    else if (session.messageCount <= 17) targetPhaseIndex = 5; // Career Guidance & Roadmap (10 Mins)
    else targetPhaseIndex = 6; // Closing & Transformation Summary (5 Mins)

    if (targetPhaseIndex !== session.currentPhaseIndex && SABCQ_PHASES[targetPhaseIndex]) {
      session.currentPhaseIndex = targetPhaseIndex;
      session.currentPhase = SABCQ_PHASES[targetPhaseIndex];
      session.phaseTurnCount = 1;
      this.logger.log(`Session ${sessionId} advanced to SABCQ Phase ${session.currentPhase.phaseNumber}: ${session.currentPhase.name}`);
    }

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
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2048,
                },
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
      currentPhase: session.currentPhase,
      totalPhasesCount: SABCQ_PHASES.length,
      reportPayloadSentInThisRequest: false,
      isLiveGemini: session.isLiveGemini,
      lastActiveAt: session.lastActiveAt,
    };
  }

  /**
   * PURE VOICE-TO-VOICE COUNSELING: NATIVE GEMINI AUDIO GENERATION
   */
  async sendVoiceMessage(sessionId: string, userMessage: string) {
    const chatResult = await this.sendMessage(sessionId, userMessage);
    const responseText = chatResult.responseText;

    let audioBase64 = '';
    let mimeType = 'audio/mp3';

    try {
      // High quality Neural Speech Audio generation for long detailed response
      const audioBuffer = await this.generateTtsAudio(responseText);
      audioBase64 = audioBuffer.toString('base64');
    } catch (err: any) {
      this.logger.warn(`TTS audio stream generation fallback: ${err.message}`);
    }

    return {
      success: true,
      sessionId,
      responseText,
      audioBase64,
      mimeType,
      messageCount: chatResult.messageCount,
      currentPhase: chatResult.currentPhase,
      totalPhasesCount: SABCQ_PHASES.length,
      isLiveGemini: chatResult.isLiveGemini,
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
   * STAGE 4: HIGH-QUALITY STUDIO TTS SPEECH GENERATION (CHUNKED AUDIO FOR FULL-LENGTH DETAILED RESPONSES)
   */
  async generateTtsAudio(text: string): Promise<Buffer> {
    const cleanText = (text || '')
      .replace(/[*#_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      throw new BadRequestException('Text is required for TTS generation.');
    }

    // Split long text into max 180-character chunks on natural sentence/clause boundaries
    const chunks: string[] = [];
    let remaining = cleanText;

    while (remaining.length > 0) {
      if (remaining.length <= 180) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = -1;
      const searchSlice = remaining.slice(0, 180);
      for (const delimiter of ['. ', '? ', '! ', ', ', ' ']) {
        const idx = searchSlice.lastIndexOf(delimiter);
        if (idx > 40) {
          splitIdx = idx + delimiter.length;
          break;
        }
      }
      if (splitIdx === -1) splitIdx = 180;

      chunks.push(remaining.slice(0, splitIdx).trim());
      remaining = remaining.slice(splitIdx).trim();
    }

    try {
      const audioBuffers: Buffer[] = [];
      for (const chunk of chunks) {
        if (!chunk) continue;
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          chunk,
        )}&tl=hi&client=tw-ob`;

        const response = await fetch(googleTtsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          audioBuffers.push(Buffer.from(arrayBuffer));
        }
      }

      if (audioBuffers.length === 0) {
        throw new Error('All TTS chunks failed to generate.');
      }

      return Buffer.concat(audioBuffers);
    } catch (err: any) {
      this.logger.error(`TTS Audio Generation error: ${err.message}`);
      throw new BadRequestException(`Failed to generate TTS audio: ${err.message}`);
    }
  }
}

/**
 * Intelligent Dynamic Context-Aware Human Counselor Class (SABCQ Engine)
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
    const name = report.studentName || 'Aman';
    const lower = message.toLowerCase().trim();
    const scores = report.studentAssessmentContext.reportData;

    const getScore = (itemName: string) => scores.find(s => s.name.toLowerCase() === itemName.toLowerCase())?.score || 0;

    // 1. Academic / Reading / Concentration / Memory / Calculation
    if (lower.includes('academic') || lower.includes('read') || lower.includes('study') || lower.includes('concentration') || lower.includes('memory') || lower.includes('calc')) {
      const reading = getScore('READING SKILLS') || 92;
      const memory = getScore('MEMORY SKILLS') || 85;
      const concentration = getScore('CONCENTRATION') || 47;
      const calc = getScore('CALCULATION') || 20;

      return `Namaste ${name}! Aaiye sabse pehle aapki Academic Foundation par baat karte hain.

STEP 1 [STRENGTH]: Aapki report ke mutabiq aapka Reading Skill **${reading}%** aur Memory Skill **${memory}%** bohot hi outstanding strength hai! Aap difficult concepts ko padhkar jaldi samajh lete hain.

STEP 2 [MEANING]: Ye strengths competitive exams aur higher studies me aapko bohot bada edge deti hain kyunki aap kam samay me zyada syllabus revise kar sakte hain.

STEP 3 [AREA TO WORK]: Lekin aapka Overall Concentration Score **${concentration}%** aur Calculation Score **${calc}%** show karta hai ki concentration consistency aur calculation accuracy me abhi practice ki zaroorat hai. Padhte waqt jab aapka dhyan bhatakta hai, toh time wastage hota hai.

STEP 4 [ACTION & SABCQ TOOL]: Iske liye aapko 2 concrete actions lene hain:
1. **Neuro-Read E-Module**: Daily 15 minute timed reading practice karein (Read -> Understand -> Active Recall).
2. **Neuro-Concentration Time Blocking**: 25-minute ka dedicated single-task focus block banayein aur distraction avoid karein.

Aap bataiye ${name}, jab aap daily padhne baithte hain, toh aapka dhyan sabse zyada kis cheez se bhatakta hai?`;
    }

    // 2. Behaviour / Hesitation / Participation / Confidence
    if (lower.includes('behaviour') || lower.includes('hesitat') || lower.includes('participat') || lower.includes('confidence') || lower.includes('fear')) {
      const sincerity = getScore('SINCERITY') || 100;
      const participation = getScore('PARTICIPATION') || 38;
      const hesitation = getScore('HESITATION') || 67;

      return `Haan ${name}, aaiye aapke Behavioural Pattern aur Confidence par baat karte hain.

STEP 1 [STRENGTH]: Aapki Sincerity Score **${sincerity}%** aur Social Supportiveness bohot high hai. Aap ek sincere aur reliable student hain jo har kaam imaandari se karta hai.

STEP 2 [MEANING]: Sincerity se log aap par trust karte hain aur team projects me aapko respect milti hai.

STEP 3 [AREA TO WORK]: Lekin aapka Participation Score **${participation}%** aur Hesitation Score **${hesitation}%** dikhata hai ki jab structured environment (jaise classroom ya presentations) me bolna hota hai, tab aap hesitate karte hain. Hesitation ka matlab yeh nahi ki aapko answer nahi pata, balki aap hesitation ki wajah se apna point express nahi karte.

STEP 4 [ACTION & SABCQ TOOL]: Iske liye hum SABCQ Behaviour Practice setup karenge:
1. Daily Classroom Target: Har din class me kam se kam 1 question poochna ya 1 answer voluntarily dena.
2. **SABCQ Habit Tracker**: Daily participation track karna.

Aap bataiye ${name}, jab class me teacher question poochte hain aur aapko answer pata hota hai, tab haath uthane se aapko kya rokta hai?`;
    }

    // 3. Law / Public Affairs / Judiciary / Politics
    if (lower.includes('law') || lower.includes('lawyer') || lower.includes('judiciary') || lower.includes('politics')) {
      const score = getScore('LAW PUBLIC AND POLITICAL AFFAIRS') || 75;
      const reading = getScore('READING SKILLS') || 100;

      return `Haan ${name}! Aapki report ke mutabiq **Law & Public Affairs** me aapka score **${score}%** hai jo ki ek top-tier career fit hai!

STEP 1 [STRENGTH]: Aapka Reading Skill **${reading}%** aur Acceptance of Challenges **100%** hai, jo Legal & Judicial studies ke liye sabse best combination mana jata hai.

STEP 2 [MEANING]: Law me thousands of pages of bare acts aur case studies read karke analyze karna padta hai. Aapki fast reading ability aapko case analysis me doosron se bohot aage rakhegi.

STEP 3 [AREA TO WORK]: Abhi aapka Communication & Public Speaking Score (49%) develop karne ki zaroorat hai taaki aap courtroom moots aur debates me apni baat strongly convince kar sakein.

STEP 4 [ACTION & SABCQ TOOL]: **SABCQ 60-Second Explanation Task**: Daily kisi bhi legal topic ya news par 1-minute ka short structured presentation practise karein aur Habit Tracker me note karein.

Kya aapko Constitutional Law, Legal Debates ya Crime/Judiciary topics padhna pasand hai?`;
    }

    // 4. Business / MBA / Management / Startup / Commerce
    if (lower.includes('business') || lower.includes('mba') || lower.includes('management') || lower.includes('startup') || lower.includes('commerce')) {
      const biz = getScore('BUSINESS') || 68;
      const mgmt = getScore('MANAGEMENT') || 57;
      const leadership = getScore('LEADERSHIP SKILLS') || 81;

      return `Bilkul ${name}! Aapki report me **Business Option Score ${biz}%** aur **Leadership Skills ${leadership}%** bohot promising direction dikha rahe hain!

STEP 1 [STRENGTH]: Aapka Business Approach Thinker score aur Leadership indicator bohot strong hai. Aap logo ko team me organize kar sakte hain aur big-picture vision samajhte hain.

STEP 2 [MEANING]: Management aur Entrepreneurship me sirf marks nahi chalte, balki team ko lead karna, decisions lena aur opportunities convert karna sabse important hota hai.

STEP 3 [AREA TO WORK]: Lekin aapka Time Management Score (20%) aur Managerial Execution Score (22%) low side par hai. Yani planning achhi hoti hai, par daily execution me routine break hota hai.

STEP 4 [ACTION & SABCQ TOOL]:
1. **SABCQ Time Management System**: Daily sirf 3 main priority tasks list karein aur unhe complete hone se pehle doosra task add na karein.
2. Skill Tracker par daily progress update karein.

Kya aap future me khud ka business/startup launch karne me interested hain ya Corporate Leadership role me?`;
    }

    // 5. Engineering / Tech / Computer Science / Coding
    if (lower.includes('engineering') || lower.includes('tech') || lower.includes('coding') || lower.includes('btech')) {
      const eng = getScore('ENGINEERING') || 20;
      const logic = getScore('LOGIC AND RESEARCH') || 100;

      return `${name}, aapki report me Engineering Option Score **${eng}%** hai, par aapka Logic & Research Score **${logic}%** bohot super high hai!

STEP 1 [STRENGTH]: Aapka Logical Thinking Score 100% hai. Aap complex logical puzzles aur reasoning bohot acchi tarah solve kar sakte hain.

STEP 2 [MEANING]: Strong logic Computer Science, Artificial Intelligence, Data Science aur Algorithmic Thinking ke liye primary requirement hoti hai.

STEP 3 [AREA TO WORK]: Technical Skills score abhi low hai kyunki aapne practical hands-on coding ya STEM projects par abhi kaam nahi kiya hai.

STEP 4 [ACTION & SABCQ TOOL]: 30-Day STEM Exploration Roadmap: Tinkercad/Scratch Python exercises aur 1-minute daily problem solving task start karein.

Kya aap Computer Science, AI, ya Robotics me exploration karna chahenge?`;
    }

    // 6. Default SABCQ Master Counseling Introduction & Summary Response
    const topScores = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
    const topList = topScores.map(t => `${t.name} (${t.score}%)`).join(', ');

    return `Namaste ${name}! Main Priya Sharma, aapki Senior AI Career Counselor. SABCQ Cognitive Pattern Program me aapka swagat hai.

STEP 1 [STRENGTH]: Aapki report analyze karne par aapke top strong areas nikal kar aaye hain: **${topList}**. Aapka Reading Skill aur Logical Personality bohot impressive hai!

STEP 2 [MEANING]: SABCQ ka matlab sirf ek test ka result Dena nahi hai, balki aapke learning pattern, behavior aur real-life skills ko 45-minute growth journey me convert karna hai.

STEP 3 [AREA TO WORK]: Concentration consistency, Calculation accuracy aur Participation me hume step-by-step practice karni hai taaki aapka potential fully transform ho sake.

STEP 4 [ACTION & SABCQ TOOL]: Hum **Neuro-Read E-Module**, **Neuro-Concentration**, aur **Habit Tracker** se aapka 30-day improvement plan shuru karenge.

Aap bataiye ${name}, aaj hum sabse pehle aapke Academic Profile ke baare me baat karein ya aapke favourite Career Options ke baare me?`;
  }
}

