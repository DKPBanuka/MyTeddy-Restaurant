import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @MessagePattern({ cmd: 'create_customer' })
  create(@Payload() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @MessagePattern({ cmd: 'get_customers' })
  findAll() {
    return this.customersService.findAll();
  }

  @MessagePattern({ cmd: 'get_customer' })
  findOne(@Payload() id: string) {
    return this.customersService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_customer' })
  update(@Payload() data: { id: string; updateDto: Partial<CreateCustomerDto> }) {
    return this.customersService.update(data.id, data.updateDto);
  }

  @MessagePattern({ cmd: 'remove_customer' })
  remove(@Payload() id: string) {
    return this.customersService.remove(id);
  }
}
