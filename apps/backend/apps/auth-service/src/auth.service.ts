import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@app/prisma';
import * as bcrypt from 'bcryptjs';

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

    async validateUserByPassword(emailOrName: string, pass: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrName },
                    { name: emailOrName }
                ]
            }
        });

        if (user && user.password && await bcrypt.compare(pass, user.password)) {
            return user;
        }
        return null;
    }

    async loginByPassword(data: { emailOrName: string; password: string }) {
        const user = await this.validateUserByPassword(data.emailOrName, data.password);
        if (!user) {
            throw new RpcException({ message: 'Invalid credentials', status: 401 });
        }
        return this.generateToken(user);
    }

    async login(pin: string) {
        const user = await this.validateUserByPin(pin);
        if (!user) {
            throw new RpcException({ message: 'Invalid PIN', status: 401 });
        }
        return this.generateToken(user);
    }

    private async generateToken(user: any) {

        // Fetch permissions (User Custom Override -> Role Defaults)
        let permissions: string[] = [];

        // ADMIN always has full access
        if (user.role === 'ADMIN') {
            try {
                const adminPerm = await this.prisma.rolePermission.findUnique({ where: { role: 'ADMIN' } });
                permissions = adminPerm?.permissions || [];
            } catch (e) {
                permissions = [];
            }
        } else if (user.permissions && user.permissions.length > 0) {
            // Use custom user permissions
            permissions = user.permissions;
        } else {
            // Fallback to Role default permissions
            try {
                const rolePerm = await this.prisma.rolePermission.findUnique({
                    where: { role: user.role }
                });
                permissions = rolePerm?.permissions || [];
            } catch (e) {
                permissions = [];
            }
        }

        try {
            const payload = { sub: user.id, name: user.name, role: user.role, permissions };
            const access_token = this.jwtService.sign(payload);
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
                    permissions: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            });
            return staff;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async createStaff(data: { name: string; role: any; pin: string; password?: string; email?: string }) {
        try {
            // Check for existing PIN
            const existing = await this.prisma.user.findUnique({ where: { pin: data.pin } });
            if (existing) {
                throw new Error('PIN is already in use by another user');
            }

            const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;

            const newUser = await this.prisma.user.create({
                data: {
                    name: data.name,
                    role: data.role,
                    pin: data.pin,
                    password: hashedPassword,
                    email: data.email,
                    permissions: data.permissions || [],
                },
                select: { id: true, name: true, role: true, permissions: true }
            });
            return newUser;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 400 });
        }
    }

    async updateStaff(id: string, data: { name?: string; role?: any; pin?: string, permissions?: string[] }) {
        try {
            if (data.pin) {
                const existing = await this.prisma.user.findUnique({ where: { pin: data.pin } });
                if (existing && existing.id !== id) {
                    throw new Error('PIN is already in use by another user');
                }
            }

            const updatedUser = await this.prisma.user.update({
                where: { id },
                data: {
                    ...data,
                    // Ensure permissions are correctly updated if provided
                    ...(data.permissions ? { permissions: data.permissions } : {})
                },
                select: { id: true, name: true, role: true, permissions: true }
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
