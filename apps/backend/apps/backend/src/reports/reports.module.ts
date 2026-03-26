import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [OrdersModule],
    controllers: [ReportsController],
})
export class ReportsModule { }
