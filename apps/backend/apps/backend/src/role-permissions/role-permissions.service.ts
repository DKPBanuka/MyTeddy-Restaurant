import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class RolePermissionsService {
    constructor(private prisma: PrismaService) { }

    // Run this to ensure all roles have default permissions at start
    async initializeDefaultPermissions() {
        const defaultPermissions: Record<Role, string[]> = {
            [Role.ADMIN]: ['POS', 'INVENTORY', 'REPORTS', 'EVENTS', 'STAFF', 'KDS'],
            [Role.MANAGER]: ['POS', 'INVENTORY', 'REPORTS', 'EVENTS', 'STAFF', 'KDS'],
            [Role.CASHIER]: ['POS'],
            [Role.WAITER]: ['POS'],
            [Role.KITCHEN]: ['KDS'],
        };

        for (const [role, permissions] of Object.entries(defaultPermissions)) {
            await this.prisma.rolePermission.upsert({
                where: { role: role as Role },
                update: {}, // Don't override existing permissions if they exist
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
