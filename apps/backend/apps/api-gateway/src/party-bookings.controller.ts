import { Controller, Post, Get, Patch, Body, Query, Param, Inject, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

import { RealTimeGateway } from './real-time.gateway';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { GetUser } from './auth/get-user.decorator';
import { AuditLogService } from '@app/prisma';

@Controller('party-bookings')
export class PartyBookingsGatewayController {
    constructor(
        @Inject('ORDER_SERVICE') private client: ClientProxy,
        @Inject('AUTH_SERVICE') private authClient: ClientProxy,
        private readonly realTime: RealTimeGateway,
        private readonly auditLog: AuditLogService
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

    @Patch(':id/void')
    @UseGuards(JwtAuthGuard)
    async voidBooking(
        @Param('id') id: string,
        @Body('managerPin') managerPin: string,
        @GetUser('id') userId: string,
        @GetUser('role') role: string
    ) {
        try {
            // SECURITY CHECK: Cancellations/Voids require Manager PIN if not Admin
            if (role !== 'ADMIN') {
                if (!managerPin) {
                    throw new HttpException('Manager Authorization PIN is required for voiding bookings.', HttpStatus.FORBIDDEN);
                }

                const pinValidation = await firstValueFrom(
                    this.authClient.send({ cmd: 'validate_temp_pin' }, { code: managerPin }).pipe(
                        catchError(error => throwError(() => new RpcException(error)))
                    )
                );

                if (!pinValidation.isValid) {
                    throw new HttpException(pinValidation.message || 'Invalid Manager PIN', HttpStatus.FORBIDDEN);
                }
            }

            const result = await firstValueFrom(
                this.client.send({ cmd: 'void_party_booking' }, { id }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );

            // Log sensitive status changes
            await this.auditLog.log('PARTY_BOOKING_VOID', userId, { 
                bookingId: id, 
                result,
                authorizedByManager: role !== 'ADMIN'
            });

            // Emit update to all clients
            this.realTime.emit('PARTY_BOOKING_UPDATED', result);
            
            return result;
        } catch (error: any) {
            if (error instanceof HttpException) throw error;
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Microservice error voiding party booking',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
