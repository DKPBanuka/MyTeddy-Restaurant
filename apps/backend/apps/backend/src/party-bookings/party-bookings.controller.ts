import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { PartyBookingsService } from './party-bookings.service';

@Controller('party-bookings')
export class PartyBookingsController {
    constructor(private readonly partyBookingsService: PartyBookingsService) { }

    @Post()
    async createBooking(@Body() createBookingDto: any) {
        return this.partyBookingsService.createBooking(createBookingDto);
    }

    @Get()
    async getBookings(
        @Query('date') date?: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        return this.partyBookingsService.getBookings({ date, month, year });
    }

    @Patch(':id/advance')
    async updateAdvance(@Param('id') id: string, @Body() body: { amount: number }) {
        return this.partyBookingsService.updateAdvance(id, body.amount);
    }

    @Patch(':id/time')
    async updateBookingTime(
        @Param('id') id: string,
        @Body() body: { eventDate: string; startTime: string; endTime: string }
    ) {
        return this.partyBookingsService.updateBookingTime(id, body.eventDate, body.startTime, body.endTime);
    }

    @Patch(':id/extras')
    async addExtras(@Param('id') id: string, @Body() body: { addonsAmount: number }) {
        return this.partyBookingsService.addExtras(id, body.addonsAmount);
    }

    @Patch(':id/items')
    async updateItems(@Param('id') id: string, @Body() body: { items: any[], menuTotal: number }) {
        return this.partyBookingsService.updateItems(id, body.items, body.menuTotal);
    }

    @Patch(':id')
    async updateBooking(@Param('id') id: string, @Body() updateData: any) {
        return this.partyBookingsService.updateBooking(id, updateData);
    }
}
