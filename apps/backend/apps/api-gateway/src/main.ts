import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for React frontend
  app.enableCors();
  await app.listen(3000);
  console.log(`API Gateway is running on: ${await app.getUrl()}`);
}
bootstrap();
