import { Module } from '@nestjs/common';
import { PartyBookingsController } from './party-bookings.controller';
import { PartyBookingsService } from './party-bookings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PartyBookingsController],
    providers: [PartyBookingsService],
})
export class PartyBookingsModule { }
