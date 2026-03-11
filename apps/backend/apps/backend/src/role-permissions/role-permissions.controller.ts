import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { Role } from '@prisma/client';

@Controller('role-permissions')
export class RolePermissionsController {
    constructor(private readonly rolePermissionsService: RolePermissionsService) { }

    @Get()
    findAll() {
        return this.rolePermissionsService.findAll();
    }

    @Patch(':role')
    updatePermissions(
        @Param('role') role: string,
        @Body('permissions') permissions: string[]
    ) {
        return this.rolePermissionsService.updatePermissions(role as Role, permissions);
    }
}
