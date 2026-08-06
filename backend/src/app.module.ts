import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EvidenceModule } from './evidence/evidence.module';

@Module({
  imports: [EvidenceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
