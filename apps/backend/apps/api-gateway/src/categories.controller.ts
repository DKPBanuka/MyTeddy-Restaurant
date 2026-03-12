import { Controller, Get, Post, Patch, Delete, Body, Param, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('categories')
export class CategoriesGatewayController {
    constructor(@Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy) {}

    @Get()
    async findAll() {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'get_categories' }, {}));
    }

    @Post()
    async create(@Body() data: { name: string }) {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'create_category' }, data));
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: { name: string }) {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'update_category' }, { id, ...data }));
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'delete_category' }, id));
    }
}
