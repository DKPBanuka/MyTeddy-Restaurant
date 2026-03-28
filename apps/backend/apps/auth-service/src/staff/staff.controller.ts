import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StaffService } from './staff.service';
import { Role } from '@prisma/client';

@Controller()
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @MessagePattern({ cmd: 'get_staff' })
    findAll() {
        return this.staffService.findAll();
    }

    @MessagePattern({ cmd: 'create_staff' })
    create(@Payload() data: { name: string; role: Role; pin: string; email?: string }) {
        return this.staffService.create(data);
    }

    @MessagePattern({ cmd: 'update_staff' })
    update(@Payload() data: { id: string; updateData: { name?: string; role?: Role; pin?: string; email?: string } }) {
        return this.staffService.update(data.id, data.updateData);
    }

    @MessagePattern({ cmd: 'delete_staff' })
    delete(@Payload() id: string) {
        return this.staffService.delete(id);
    }
}
