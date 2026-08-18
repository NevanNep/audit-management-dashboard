import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173',
  });
  // Serves backend/data over HTTP so EVIDENCE_WORKBOOK_URL can point at the
  // local sample workbook, simulating a hosted (e.g. SharePoint) source.
  app.useStaticAssets(join(__dirname, '..', 'data'), { prefix: '/static' });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
