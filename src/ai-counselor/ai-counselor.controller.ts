import { Controller, Post, Get, Body, Param, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AiCounselorService } from './ai-counselor.service';
import { StartSessionDto } from './dto/start-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('api/v1/ai-counselor')
export class AiCounselorController {
  constructor(private readonly counselorService: AiCounselorService) {}

  /**
   * STAGE 1: SESSION START (REPORT LOADED ONLY ONCE)
   */
  @Post('session/start')
  @HttpCode(HttpStatus.OK)
  async startSession(@Body() body: StartSessionDto) {
    return this.counselorService.startCounselorSession(body.studentId, body.languagePreference);
  }

  /**
   * STAGE 2: ACTIVE CHATTING (NO REPORT SENT AGAIN)
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() body: SendMessageDto) {
    return this.counselorService.sendMessage(body.sessionId, body.message);
  }

  /**
   * STAGE 3: MANUAL ERASE / CLEANUP
   */
  @Post('session/end')
  @HttpCode(HttpStatus.OK)
  async endSession(@Body('sessionId') sessionId: string) {
    return this.counselorService.endSession(sessionId);
  }

  /**
   * GET ACTIVE SESSION STATUS & TTL TIMER
   */
  @Get('session/:sessionId/status')
  getSessionStatus(@Param('sessionId') sessionId: string) {
    return this.counselorService.getSessionStatus(sessionId);
  }

  /**
   * GET DUMMY STUDENT REPORT FOR INSPECTION
   */
  @Get('dummy-report')
  getDummyReport() {
    return this.counselorService.getDummyReport();
  }

  /**
   * STAGE 4: HIGH-QUALITY HD SPEECH AUDIO STREAM (NEURAL TTS)
   */
  @Get('tts')
  async getTtsAudio(@Query('text') text: string, @Res() res: any) {
    const audioBuffer = await this.counselorService.generateTtsAudio(text);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(audioBuffer);
  }
}
