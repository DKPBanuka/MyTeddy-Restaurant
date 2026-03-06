import * as dotenv from 'dotenv';
import * as path from 'path';

// Force load before anything else starts
dotenv.config({ path: path.resolve(process.cwd(), 'apps', 'backend', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for the frontend
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
