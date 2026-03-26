import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '@app/prisma';
import { OrderServiceController } from './order-service.controller';
import { OrderServiceService } from './order-service.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PartyBookingController } from './party-booking.controller';
import { PartyBookingService } from './party-booking.service';

import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [
    PrismaModule,
    CustomersModule,
    ClientsModule.register([
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3002 }, // Changed from 3001 to 3002
      },
    ]),
  ],
  controllers: [OrderController, PartyBookingController, OrderServiceController],
  providers: [OrderService, PartyBookingService, OrderServiceService],
})
export class OrderServiceModule { }
