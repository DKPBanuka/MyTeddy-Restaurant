import { Controller, Get, Patch, Body, Param } from '@nestjs/common';

@Controller('role-permissions')
export class RolePermissionsController {
    @Get()
    getPermissions() {
        return {
            'ADMIN': ['*'],
            'MANAGER': ['view_dashboard', 'manage_orders', 'manage_inventory', 'manage_bookings', 'manage_menu'],
            'CASHIER': ['view_dashboard', 'manage_orders', 'view_bookings'],
            'CHEF': ['view_kitchen']
        };
    }

    @Patch(':role')
    updatePermissions(@Param('role') role: string, @Body('permissions') permissions: string[]) {
        return { success: true, role, permissions };
    }
}
