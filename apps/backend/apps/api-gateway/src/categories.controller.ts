import { Controller, Get, Post, Patch, Delete, Body, Param, Inject, Query } from '@nestjs/common';
import { RealTimeGateway } from './real-time.gateway';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('categories')
export class CategoriesGatewayController {
    constructor(
        @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
        private readonly realTime: RealTimeGateway
    ) {}

    @Get()
    async findAll() {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'get_categories' }, {}));
    }

    @Post()
    async create(@Body() data: { name: string }) {
        const result = await firstValueFrom(this.inventoryClient.send({ cmd: 'create_category' }, data));
        this.realTime.emit('PRODUCT_UPDATED', { type: 'CATEGORY_CREATED' });
        return result;
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: { name: string }) {
        const result = await firstValueFrom(this.inventoryClient.send({ cmd: 'update_category' }, { id, ...data }));
        this.realTime.emit('PRODUCT_UPDATED', { type: 'CATEGORY_UPDATED', id });
        return result;
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const result = await firstValueFrom(this.inventoryClient.send({ cmd: 'delete_category' }, id));
        this.realTime.emit('PRODUCT_UPDATED', { type: 'CATEGORY_DELETED', id });
        return result;
    }
}
