import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { Role } from '@prisma/client';

@Injectable()
export class RolePermissionsService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.initializeDefaultPermissions();
    }

    async initializeDefaultPermissions() {
        const defaultPermissions: Record<Role, string[]> = {
            [Role.ADMIN]: [
                'POS_ACCESS', 'INVENTORY_MANAGE', 'REPORTS_VIEW', 'EVENTS_MANAGE', 
                'STAFF_MANAGE', 'KDS_ACCESS', 'ANALYSIS_VIEW', 'MENU_MANAGE', 'SETTINGS_MANAGE'
            ],
            [Role.MANAGER]: [
                'POS_ACCESS', 'INVENTORY_MANAGE', 'REPORTS_VIEW', 'EVENTS_MANAGE', 
                'KDS_ACCESS', 'ANALYSIS_VIEW'
            ],
            [Role.CASHIER]: ['POS_ACCESS'],
            [Role.WAITER]: ['POS_ACCESS'],
            [Role.KITCHEN]: ['KDS_ACCESS'],
        };

        for (const [role, permissions] of Object.entries(defaultPermissions)) {
            await this.prisma.rolePermission.upsert({
                where: { role: role as Role },
                update: { permissions: permissions }, // Force update to new names
                create: {
                    role: role as Role,
                    permissions: permissions,
                },
            });
        }
    }

    async findAll() {
        return this.prisma.rolePermission.findMany({
            orderBy: { role: 'asc' }
        });
    }

    async findByRole(role: Role) {
        return this.prisma.rolePermission.findUnique({
            where: { role }
        });
    }

    async updatePermissions(role: Role, permissions: string[]) {
        return this.prisma.rolePermission.upsert({
            where: { role },
            update: { permissions },
            create: { role, permissions }
        });
    }
}
