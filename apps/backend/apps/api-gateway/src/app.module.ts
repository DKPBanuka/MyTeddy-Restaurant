import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthGatewayController } from './auth.controller';
import { ProductsGatewayController } from './products.controller';
import { OrdersGatewayController } from './orders.controller';
import { InventoryGatewayController } from './inventory.controller';
import { ReportsGatewayController } from './reports.controller';
import { StaffGatewayController } from './staff.controller';
import { PartyBookingsGatewayController } from './party-bookings.controller';
import { CategoriesGatewayController } from './categories.controller';

@Module({
    imports: [
        ClientsModule.register([
            { name: 'AUTH_SERVICE', transport: Transport.TCP, options: { host: 'auth-service', port: 3001 } },
            { name: 'INVENTORY_SERVICE', transport: Transport.TCP, options: { host: 'inventory-service', port: 3002 } },
            { name: 'ORDER_SERVICE', transport: Transport.TCP, options: { host: 'order-service', port: 3003 } },
        ]),
    ],
    controllers: [
        AuthGatewayController,
        ProductsGatewayController,
        OrdersGatewayController,
        InventoryGatewayController,
        ReportsGatewayController,
        StaffGatewayController,
        PartyBookingsGatewayController,
        CategoriesGatewayController
    ],
    providers: [],
})
export class AppModule { }
