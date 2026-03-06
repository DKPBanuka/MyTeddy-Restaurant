import { Controller, Post, Get, Patch, Body, Query, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('party-bookings')
export class PartyBookingsGatewayController {
    constructor(@Inject('ORDER_SERVICE') private client: ClientProxy) { }

    @Post()
    async createBooking(@Body() createBookingDto: any) {
        return firstValueFrom(this.client.send({ cmd: 'create_party_booking' }, createBookingDto));
    }

    @Get()
    async getBookings(
        @Query('date') date?: string,
        @Query('month') month?: string,
        @Query('year') year?: string
    ) {
        return firstValueFrom(this.client.send({ cmd: 'get_party_bookings' }, { date, month, year }));
    }

    @Patch(':id/advance')
    async updateAdvance(@Param('id') id: string, @Body() updateDto: { amount: number }) {
        return firstValueFrom(this.client.send({ cmd: 'update_party_booking_advance' }, { id, amount: updateDto.amount }));
    }
}
