import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { PartyBookingsModule } from './party-bookings/party-bookings.module';
import { InventoryModule } from './inventory/inventory.module';
import { CategoriesModule } from './categories/categories.module';
import { SettingsModule } from './settings/settings.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [PrismaModule, ProductsModule, OrdersModule, AuthModule, PartyBookingsModule, InventoryModule, CategoriesModule, SettingsModule, CustomersModule, ReportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
