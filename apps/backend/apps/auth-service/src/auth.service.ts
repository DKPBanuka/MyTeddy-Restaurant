import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/prisma';
import * as fs from 'fs';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    async validateUserByPin(pin: string) {
        const user = await this.prisma.user.findUnique({
            where: { pin },
        });
        if (!user) return null;
        return user;
    }

    async login(pin: string) {
        fs.appendFileSync('./auth_debug.log', `Login attempt for PIN: ${pin}\n`);
        const user = await this.validateUserByPin(pin);
        if (!user) {
            fs.appendFileSync('./auth_debug.log', `Invalid PIN: ${pin}\n`);
            throw new RpcException({ message: 'Invalid PIN', status: 401 });
        }
        fs.appendFileSync('./auth_debug.log', `User found: ${user.id}, Role: ${user.role}\n`);

        // Fetch permissions for the role using raw query to bypass stale generated client issues
        let permissions: string[] = [];
        try {
            fs.appendFileSync('./auth_debug.log', `Fetching permissions for role: ${user.role}\n`);
            const rolePerms: any[] = await this.prisma.$queryRawUnsafe(
                `SELECT permissions FROM "RolePermission" WHERE role = $1`,
                user.role
            );
            fs.appendFileSync('./auth_debug.log', `Raw query result: ${JSON.stringify(rolePerms)}\n`);
            if (rolePerms && rolePerms.length > 0) {
                permissions = rolePerms[0].permissions || [];
            }
        } catch (e: any) {
            fs.appendFileSync('./auth_debug.log', `Error fetching role permissions: ${e.message}\n`);
            // Default to empty for now if table doesn't exist or query fails
            permissions = [];
        }

        try {
            fs.appendFileSync('./auth_debug.log', `Signing JWT payload\n`);
            const payload = { sub: user.id, name: user.name, role: user.role, permissions };
            const access_token = this.jwtService.sign(payload);
            fs.appendFileSync('./auth_debug.log', `Login success for user: ${user.id}\n`);
            return {
                access_token,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    permissions: permissions
                }
            };
        } catch (e: any) {
            fs.appendFileSync('./auth_debug.log', `Error signing JWT or returning result: ${e.message}\n`);
            throw new RpcException({ message: `Login failed internally: ${e.message}`, status: 500 });
        }
    }

    async getStaff() {
        try {
            const staff = await this.prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    role: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            });
            return staff;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async createStaff(data: { name: string; role: any; pin: string }) {
        try {
            // Check for existing PIN
            const existing = await this.prisma.user.findUnique({ where: { pin: data.pin } });
            if (existing) {
                throw new Error('PIN is already in use by another user');
            }

            const newUser = await this.prisma.user.create({
                data: {
                    name: data.name,
                    role: data.role,
                    pin: data.pin,
                },
                select: { id: true, name: true, role: true }
            });
            return newUser;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 400 });
        }
    }

    async updateStaff(id: string, data: { name?: string; role?: any; pin?: string }) {
        try {
            if (data.pin) {
                const existing = await this.prisma.user.findUnique({ where: { pin: data.pin } });
                if (existing && existing.id !== id) {
                    throw new Error('PIN is already in use by another user');
                }
            }

            const updatedUser = await this.prisma.user.update({
                where: { id },
                data,
                select: { id: true, name: true, role: true }
            });
            return updatedUser;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 400 });
        }
    }

    async deleteStaff(id: string) {
        try {
            // Prisma will fail if orders are strictly tied without cascading, 
            // but assuming POS users can be safely soft-deleted or hard-deleted if no orders are present.
            await this.prisma.user.delete({
                where: { id }
            });
            return { success: true, message: 'User deleted successfully' };
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 400 });
        }
    }
}
