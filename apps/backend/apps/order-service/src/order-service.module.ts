import { Module } from '@nestjs/common';
import { OrderServiceController } from './order-service.controller';
import { OrderServiceService } from './order-service.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PartyBookingController } from './party-booking.controller';
import { PartyBookingService } from './party-booking.service';
import { PrismaService } from '@app/prisma';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
    ]),
  ],
  controllers: [OrderServiceController, OrderController, PartyBookingController],
  providers: [OrderServiceService, OrderService, PartyBookingService, PrismaService],
})
export class OrderServiceModule { }
