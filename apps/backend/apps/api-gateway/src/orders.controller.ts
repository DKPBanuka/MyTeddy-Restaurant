import { Controller, Post, Get, Patch, Body, Param, Inject, HttpException, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

import { RealTimeGateway } from './real-time.gateway';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { GetUser } from './auth/get-user.decorator';
import { AuditLogService } from '@app/prisma';

@Controller('orders')
export class OrdersGatewayController {
    constructor(
        @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
        @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
        private readonly realTime: RealTimeGateway,
        private readonly auditLog: AuditLogService
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createOrder(@Body() createOrderDto: any, @GetUser('id') userId: string) {
        try {
            // Force the userId from token to prevent spoofing
            const payload = { ...createOrderDto, userId };
            
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'create_order' }, payload).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            this.realTime.emit('ORDER_UPDATED', result);
            return result;
        } catch (error: any) {
            console.error('OrdersGatewayController.createOrder FAILED:', JSON.stringify(error));
            const errorMessage = error.message || (error.error && typeof error.error === 'object' ? error.error.message : error.error) || 'Microservice error';
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: errorMessage,
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Get()
    async getOrders(@Query() query: any) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'get_orders' }, query || {}).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Microservice error fetching orders',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('kitchen')
    async getKitchenOrders() {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'get_kitchen_orders' }, {}).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Microservice error fetching kitchen orders',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('tables/status')
    async getTableStatus() {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'get_table_status' }, {}).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Microservice error fetching table status',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('pending')
    async getPendingOrders() {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'get_pending_orders' }, {}).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Microservice error fetching pending orders',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    async updateOrderStatus(
        @Param('id') id: string, 
        @Body('status') status: string,
        @Body('managerPin') managerPin: string,
        @GetUser('id') userId: string,
        @GetUser('role') role: string
    ) {
        try {
            // SECURITY CHECK: Cancellations require Manager PIN if not Admin
            if (status === 'CANCELLED' && role !== 'ADMIN') {
                if (!managerPin) {
                    throw new HttpException('Manager Authorization PIN is required for cancellations.', HttpStatus.FORBIDDEN);
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
                this.orderClient.send({ cmd: 'update_order_status' }, { id, status }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            
            // Log sensitive status changes
            if (status === 'CANCELLED' || status === 'COMPLETED') {
                await this.auditLog.log(`ORDER_STATUS_CHANGE_${status}`, userId, { 
                    orderId: id, 
                    result,
                    authorizedByManager: status === 'CANCELLED' && role !== 'ADMIN'
                });
            }

            // Emit update to all clients
            console.log(`[OrdersGateway] Status update successful for ${id}, emitting ORDER_UPDATED`);
            this.realTime.emit('ORDER_UPDATED', { id, status, result });
            
            return result;
        } catch (error: any) {
            if (error instanceof HttpException) throw error;
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Microservice error updating order status',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Patch(':id/items')
    async updateOrderItems(@Param('id') id: string, @Body() updateData: { items: any[], totalAmount: number }) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'update_order_items' }, { id, ...updateData }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            this.realTime.emit('ORDER_UPDATED', result);
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Microservice error updating order items',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Patch(':id/pay')
    @UseGuards(JwtAuthGuard)
    async payOrder(
        @Param('id') id: string, 
        @Body() paymentDetails: any,
        @GetUser('id') userId: string
    ) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'pay_order' }, { id, paymentDetails }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );

            // Log payment action
            await this.auditLog.log('ORDER_PAYMENT', userId, { orderId: id, amount: paymentDetails.amount });

            this.realTime.emit('ORDER_UPDATED', result);
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Microservice error paying order',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Patch(':id/split-pay')
    @UseGuards(JwtAuthGuard)
    async splitPayOrder(
        @Param('id') id: string, 
        @Body() splitDetails: any,
        @GetUser('id') userId: string
    ) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'split_pay_order' }, { id, splitDetails }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );

            // Log split payment action
            await this.auditLog.log('ORDER_SPLIT_PAYMENT', userId, { orderId: id, details: splitDetails });

            this.realTime.emit('ORDER_UPDATED', result);
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Microservice error processing split payment',
            }, HttpStatus.BAD_REQUEST);
        }
    }
}
