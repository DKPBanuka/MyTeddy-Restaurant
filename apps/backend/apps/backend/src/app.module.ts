import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { PartyBookingsModule } from './party-bookings/party-bookings.module';
import { InventoryModule } from './inventory/inventory.module';
import { StaffModule } from './staff/staff.module';
import { RolePermissionsModule } from './role-permissions/role-permissions.module';

import { CategoriesModule } from './categories/categories.module';
import { SettingsModule } from './settings/settings.module';
import { CustomersModule } from './customers/customers.module';

@Module({
  imports: [PrismaModule, ProductsModule, OrdersModule, AuthModule, PartyBookingsModule, InventoryModule, StaffModule, RolePermissionsModule, CategoriesModule, SettingsModule, CustomersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
