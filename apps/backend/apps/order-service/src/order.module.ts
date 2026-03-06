import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PrismaModule } from '@app/prisma';

@Module({
    imports: [
        PrismaModule,
        ClientsModule.register([
            { name: 'INVENTORY_SERVICE', transport: Transport.TCP, options: { host: 'inventory-service', port: 3002 } },
        ]),
    ],
    controllers: [OrderController],
    providers: [OrderService],
})
export class OrderModule { }
