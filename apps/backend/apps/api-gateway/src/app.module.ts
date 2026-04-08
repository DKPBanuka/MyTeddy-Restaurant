import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from '@app/prisma';
import { AuthGatewayController } from './auth.controller';
import { ProductsGatewayController } from './products.controller';
import { OrdersGatewayController } from './orders.controller';
import { InventoryGatewayController } from './inventory.controller';
import { ReportsGatewayController } from './reports.controller';
import { StaffGatewayController } from './staff.controller';
import { PartyBookingsGatewayController } from './party-bookings.controller';
import { CategoriesGatewayController } from './categories.controller';
import { SettingsController } from './settings.controller';
import { RolePermissionsController } from './role-permissions.controller';

import { CustomersGatewayController } from './customers.controller';
import { RealTimeGateway } from './real-time.gateway';

@Module({
    imports: [
        PrismaModule,
        ClientsModule.register([
            { name: 'AUTH_SERVICE', transport: Transport.TCP, options: { host: process.env.AUTH_SERVICE_HOST || 'auth-service', port: 3001 } },
            { name: 'INVENTORY_SERVICE', transport: Transport.TCP, options: { host: process.env.INVENTORY_SERVICE_HOST || 'inventory-service', port: 3002 } },
            { name: 'ORDER_SERVICE', transport: Transport.TCP, options: { host: process.env.ORDER_SERVICE_HOST || 'order-service', port: 3003 } },
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
        CategoriesGatewayController,
        SettingsController,
        RolePermissionsController,
        CustomersGatewayController,
    ],
    providers: [RealTimeGateway],
})
export class AppModule { }
