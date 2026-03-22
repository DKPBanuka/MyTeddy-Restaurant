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
        try {
            return await firstValueFrom(this.client.send({ cmd: 'get_party_bookings' }, { date, month, year }));
        } catch (error) {
            console.error('Gateway Error fetching party bookings:', error);
            return [];
        }
    }

    @Patch(':id/advance')
    async updateAdvance(@Param('id') id: string, @Body() updateDto: { amount: number }) {
        return firstValueFrom(this.client.send({ cmd: 'update_party_booking_advance' }, { id, amount: updateDto.amount }));
    }

    @Patch(':id/time')
    async updateBookingTime(
        @Param('id') id: string,
        @Body() body: { eventDate: string; startTime: string; endTime: string }
    ) {
        return firstValueFrom(this.client.send({ cmd: 'update_party_booking_time' }, { id, ...body }));
    }

    @Patch(':id/extras')
    async addExtras(@Param('id') id: string, @Body() body: { addonsAmount: number }) {
        return firstValueFrom(this.client.send({ cmd: 'add_party_booking_extras' }, { id, ...body }));
    }

    @Patch(':id/items')
    async updateItems(@Param('id') id: string, @Body() body: { items: any[], menuTotal: number }) {
        return firstValueFrom(this.client.send({ cmd: 'update_party_booking_items' }, { id, ...body }));
    }

    @Patch(':id')
    async updateBooking(@Param('id') id: string, @Body() updateData: any) {
        return firstValueFrom(this.client.send({ cmd: 'update_party_booking' }, { id, updateData }));
    }
}
