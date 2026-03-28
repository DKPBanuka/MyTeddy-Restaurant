import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RolePermissionsService } from './role-permissions.service';
import { Role } from '@prisma/client';

@Controller()
export class RolePermissionsController {
    constructor(private readonly rolePermissionsService: RolePermissionsService) { }

    @MessagePattern({ cmd: 'get_role_permissions' })
    findAll() {
        return this.rolePermissionsService.findAll();
    }

    @MessagePattern({ cmd: 'get_role_permissions_by_role' })
    findByRole(@Payload() role: Role) {
        return this.rolePermissionsService.findByRole(role);
    }

    @MessagePattern({ cmd: 'update_role_permissions' })
    updatePermissions(@Payload() data: { role: Role, permissions: string[] }) {
        return this.rolePermissionsService.updatePermissions(data.role, data.permissions);
    }
}
