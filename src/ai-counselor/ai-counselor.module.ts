import { Module } from '@nestjs/common';
import { AiCounselorController } from './ai-counselor.controller';
import { AiCounselorService } from './ai-counselor.service';
import { AiCounselorGateway } from './ai-counselor.gateway';

@Module({
  controllers: [AiCounselorController],
  providers: [AiCounselorService, AiCounselorGateway],
  exports: [AiCounselorService, AiCounselorGateway],
})
export class AiCounselorModule {}
