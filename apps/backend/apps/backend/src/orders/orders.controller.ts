import { Controller, Post, Body } from '@nestjs/common';
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
}
