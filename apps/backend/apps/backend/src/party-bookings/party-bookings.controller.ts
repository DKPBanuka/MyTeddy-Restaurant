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
}
