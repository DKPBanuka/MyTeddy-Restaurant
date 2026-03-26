import { Controller, Get } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get('summary')
    async getReportsSummary() {
        return this.ordersService.getReportsSummary();
    }
}
