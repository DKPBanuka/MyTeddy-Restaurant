import { Controller, Post, Get, Patch, Body, Param, Inject, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

@Controller('orders')
export class OrdersGatewayController {
    constructor(@Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy) { }

    @Post()
    async createOrder(@Body() createOrderDto: any) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'create_order' }, createOrderDto).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
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
    async updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'update_order_status' }, { id, status }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
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
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Microservice error updating order items',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Patch(':id/pay')
    async payOrder(@Param('id') id: string, @Body() paymentDetails: any) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'pay_order' }, { id, paymentDetails }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Microservice error paying order',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Patch(':id/split-pay')
    async splitPayOrder(@Param('id') id: string, @Body() splitDetails: any) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'split_pay_order' }, { id, splitDetails }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Microservice error processing split payment',
            }, HttpStatus.BAD_REQUEST);
        }
    }
}
