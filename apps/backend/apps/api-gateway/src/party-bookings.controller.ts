import { Controller, Post, Get, Patch, Body, Query, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { RealTimeGateway } from './real-time.gateway';

@Controller('party-bookings')
export class PartyBookingsGatewayController {
    constructor(
        @Inject('ORDER_SERVICE') private client: ClientProxy,
        private readonly realTime: RealTimeGateway
    ) { }

    @Post()
    async createBooking(@Body() createBookingDto: any) {
        try {
            const result = await firstValueFrom(this.client.send({ cmd: 'create_party_booking' }, createBookingDto));
            this.realTime.emit('PARTY_BOOKING_UPDATED', result);
            return result;
        } catch (error) {
            console.error('Gateway Error creating party booking:', error);
            throw error;
        }
    }

    @Get()
    async getBookings(
        @Query('date') date?: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('paymentStatus') paymentStatus?: string
    ) {
        console.log('Gateway fetching bookings with filters:', { date, month, year, startDate, endDate, paymentStatus });
        try {
            const result = await firstValueFrom(this.client.send({ cmd: 'get_party_bookings' }, { 
                date, month, year, startDate, endDate, paymentStatus 
            }));
            return result;
        } catch (error) {
            console.error('Gateway Error fetching party bookings:', error);
            return [];
        }
    }

    @Patch(':id/advance')
    async updateAdvance(@Param('id') id: string, @Body() updateDto: { amount: number }) {
        try {
            const result = await firstValueFrom(this.client.send({ cmd: 'update_party_booking_advance' }, { id, amount: updateDto.amount }));
            this.realTime.emit('PARTY_BOOKING_UPDATED', result);
            return result;
        } catch (error) {
            console.error('Gateway Error updating advance:', error);
            throw error;
        }
    }

    @Patch(':id/time')
    async updateBookingTime(
        @Param('id') id: string,
        @Body() body: { eventDate: string; startTime: string; endTime: string }
    ) {
        try {
            const result = await firstValueFrom(this.client.send({ cmd: 'update_party_booking_time' }, { id, ...body }));
            this.realTime.emit('PARTY_BOOKING_UPDATED', result);
            return result;
        } catch (error) {
            console.error('Gateway Error updating time:', error);
            throw error;
        }
    }

    @Patch(':id/extras')
    async addExtras(@Param('id') id: string, @Body() body: { addonsAmount: number }) {
        try {
            const result = await firstValueFrom(this.client.send({ cmd: 'add_party_booking_extras' }, { id, ...body }));
            this.realTime.emit('PARTY_BOOKING_UPDATED', result);
            return result;
        } catch (error) {
            console.error('Gateway Error adding extras:', error);
            throw error;
        }
    }

    @Patch(':id/items')
    async updateItems(@Param('id') id: string, @Body() body: { items: any[], menuTotal: number }) {
        try {
            const result = await firstValueFrom(this.client.send({ cmd: 'update_party_booking_items' }, { id, ...body }));
            this.realTime.emit('PARTY_BOOKING_UPDATED', result);
            return result;
        } catch (error) {
            console.error('Gateway Error updating items:', error);
            throw error;
        }
    }

    @Patch(':id')
    async updateBooking(@Param('id') id: string, @Body() updateData: any) {
        try {
            const result = await firstValueFrom(this.client.send({ cmd: 'update_party_booking' }, { id, updateData }));
            this.realTime.emit('PARTY_BOOKING_UPDATED', result);
            return result;
        } catch (error) {
            console.error('Gateway Error updating booking:', error);
            throw error;
        }
    }
}
