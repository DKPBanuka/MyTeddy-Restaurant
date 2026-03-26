import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('customers')
export class CustomersGatewayController {
  constructor(@Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy) {}

  @Post()
  async create(@Body() data: any) {
    return firstValueFrom(this.orderClient.send({ cmd: 'create_customer' }, data));
  }

  @Get()
  async findAll() {
    return firstValueFrom(this.orderClient.send({ cmd: 'get_customers' }, {}));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return firstValueFrom(this.orderClient.send({ cmd: 'get_customer' }, id));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return firstValueFrom(this.orderClient.send({ cmd: 'update_customer' }, { id, updateDto: data }));
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return firstValueFrom(this.orderClient.send({ cmd: 'remove_customer' }, id));
  }
}
