import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrderService } from './order.service';

@Controller()
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    @MessagePattern({ cmd: 'create_order' })
    async createOrder(@Payload() createOrderDto: any) {
        return this.orderService.createOrder(createOrderDto);
    }

    @MessagePattern({ cmd: 'get_orders' })
    @MessagePattern('get_orders')
    async getOrders(@Payload() query: any) {
        return this.orderService.getOrders(query || {});
    }

    @MessagePattern({ cmd: 'get_kitchen_orders' })
    async getKitchenOrders() {
        return this.orderService.getKitchenOrders();
    }

    @MessagePattern({ cmd: 'get_table_status' })
    async getTableStatus() {
        return this.orderService.getTableStatus();
    }

    @MessagePattern({ cmd: 'get_pending_orders' })
    async getPendingOrders() {
        return this.orderService.getPendingOrders();
    }

    @MessagePattern({ cmd: 'update_order_status' })
    async updateOrderStatus(@Payload() data: { id: string, status: string }) {
        return this.orderService.updateOrderStatus(data.id, data.status);
    }

    @MessagePattern({ cmd: 'update_order_items' })
    async updateOrderItems(@Payload() data: { id: string, items: any[], totalAmount: number }) {
        return this.orderService.updateOrderItems(data.id, { items: data.items, totalAmount: data.totalAmount });
    }

    @MessagePattern({ cmd: 'pay_order' })
    async payOrder(@Payload() data: { id: string, paymentDetails: any }) {
        return this.orderService.payOrder(data.id, data.paymentDetails);
    }

    @MessagePattern({ cmd: 'get_reports_summary' })
    async getReportsSummary() {
        return this.orderService.getReportsSummary();
    }
}
