import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';

export interface OrderItemDto {
    productId: string;
    quantity: number;
    type: string;
    notes?: string;
}

export interface CreateOrderDto {
    items: OrderItemDto[];
    totalAmount: number;
    paymentMethod?: string;
    amountReceived?: number;
    change?: number;
    paymentStatus?: 'UNPAID' | 'PAID';
    orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    tableNo?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
}

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    async createOrder(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.createOrder(createOrderDto);
    }

    @Get('pending')
    async getPendingOrders() {
        return this.ordersService.getPendingOrders();
    }

    @Get('kitchen')
    async getKitchenOrders() {
        return this.ordersService.getKitchenOrders();
    }

    @Get('tables/status')
    async getTableStatus() {
        return this.ordersService.getTableStatus();
    }

    @Patch(':id/pay')
    async payOrder(@Param('id') id: string, @Body() body: { method: string; amountReceived?: number; change?: number }) {
        return this.ordersService.payOrder(id, body);
    }

    @Patch(':id/status')
    async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
        return this.ordersService.updateOrderStatus(id, body.status);
    }

    @Patch(':id/items')
    async updateItems(@Param('id') id: string, @Body() body: { items: any[]; totalAmount: number }) {
        return this.ordersService.updateOrderItems(id, body);
    }
}
