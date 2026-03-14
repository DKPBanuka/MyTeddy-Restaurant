import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load before anything else starts
dotenv.config({ path: path.resolve(process.cwd(), 'apps', 'backend', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors(); // Enable CORS for the frontend
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
