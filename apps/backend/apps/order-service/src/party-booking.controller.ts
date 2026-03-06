import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PartyBookingService } from './party-booking.service';

@Controller()
export class PartyBookingController {
    constructor(private readonly partyBookingService: PartyBookingService) { }

    @MessagePattern({ cmd: 'create_party_booking' })
    async createBooking(@Payload() data: any) {
        return this.partyBookingService.createBooking(data);
    }

    @MessagePattern({ cmd: 'get_party_bookings' })
    async getBookings(@Payload() filters: any) {
        return this.partyBookingService.getBookings(filters);
    }

    @MessagePattern({ cmd: 'update_party_booking_advance' })
    async updateAdvance(@Payload() data: { id: string, amount: number }) {
        return this.partyBookingService.updateAdvance(data.id, data.amount);
    }
}
