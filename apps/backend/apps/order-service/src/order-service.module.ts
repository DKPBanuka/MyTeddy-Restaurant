import { Module } from '@nestjs/common';
import { OrderServiceController } from './order-service.controller';
import { OrderServiceService } from './order-service.service';
import { PartyBookingController } from './party-booking.controller';
import { PartyBookingService } from './party-booking.service';
import { PrismaService } from '@app/prisma';

@Module({
  imports: [],
  controllers: [OrderServiceController, PartyBookingController],
  providers: [OrderServiceService, PartyBookingService, PrismaService],
})
export class OrderServiceModule { }
