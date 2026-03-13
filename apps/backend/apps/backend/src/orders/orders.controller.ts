import { Controller, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';

export interface OrderItemDto {
    productId?: string;
    packageId?: string;
    quantity: number;
    type: string;
    notes?: string;
    sizeId?: string;
    addonIds?: string[];
}

export interface CreateOrderDto {
    items: OrderItemDto[];
    totalAmount: number;
    subTotal?: number;
    discount?: number;
    grandTotal?: number;
    paymentMethod?: 'CASH' | 'CARD' | 'ONLINE';
    amountReceived?: number;
    change?: number;
    paymentStatus?: 'UNPAID' | 'PAID' | 'REFUNDED';
    orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    tableNo?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
}

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    async getOrders(@Query() query: any) {
        return this.ordersService.getOrders(query);
    }

    @Patch(':id/refund')
    async refundOrder(@Param('id') id: string, @Body() body: { reason: string }) {
        return this.ordersService.refundOrder(id, body.reason);
    }

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
    async updateStatus(@Param('id') id: string, @Body() body: { orderStatus: string }) {
        return this.ordersService.updateOrderStatus(id, body.orderStatus);
    }

    @Patch(':id/undo')
    async undoStatus(@Param('id') id: string) {
        return this.ordersService.undoOrderStatus(id);
    }

    @Patch(':id/items')
    async updateItems(@Param('id') id: string, @Body() body: { items: any[]; totalAmount: number }) {
        return this.ordersService.updateOrderItems(id, body);
    }
}
