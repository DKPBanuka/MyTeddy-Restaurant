import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables for Prisma
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps', 'backend', '.env') });

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrderServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3003,
      },
    },
  );
  await app.listen();
  console.log('Order Microservice is listening on TCP port 3003');
  console.log('DIAGNOSTIC: INVENTORY_SERVICE_HOST =', process.env.INVENTORY_SERVICE_HOST || 'NOT_SET');
}
bootstrap();
