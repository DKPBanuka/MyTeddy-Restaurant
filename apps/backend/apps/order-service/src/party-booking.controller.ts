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

    @MessagePattern({ cmd: 'update_party_booking_time' })
    async updateBookingTime(@Payload() data: { id: string, eventDate: string, startTime: string, endTime: string }) {
        return this.partyBookingService.updateBookingTime(data.id, data.eventDate, data.startTime, data.endTime);
    }

    @MessagePattern({ cmd: 'add_party_booking_extras' })
    async addExtras(@Payload() data: { id: string, addonsAmount: number }) {
        return this.partyBookingService.addExtras(data.id, data.addonsAmount);
    }

    @MessagePattern({ cmd: 'update_party_booking_items' })
    async updateItems(@Payload() data: { id: string, items: any[], menuTotal: number }) {
        return this.partyBookingService.updateItems(data.id, data.items, data.menuTotal);
    }

    @MessagePattern({ cmd: 'update_party_booking' })
    async updateBooking(@Payload() data: { id: string, updateData: any }) {
        return this.partyBookingService.updateBooking(data.id, data.updateData);
    }
}
