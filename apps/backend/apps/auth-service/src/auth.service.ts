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


    async generateTemporaryPin(adminId: string) {
        try {
            // Generate a 6-digit random code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Set expiry to 10 minutes from now
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 10);

            return await this.prisma.temporaryPin.create({
                data: {
                    code,
                    expiresAt,
                    createdBy: adminId,
                    purpose: 'VOID_ORDER'
                }
            });
        } catch (error: any) {
            throw new RpcException({ message: `Failed to generate PIN: ${error.message}`, status: 500 });
        }
    }

    async validateTemporaryPin(code: string) {
        try {
            const pin = await this.prisma.temporaryPin.findUnique({
                where: { code }
            });

            if (!pin) {
                return { isValid: false, message: 'Invalid PIN' };
            }

            if (pin.isUsed) {
                return { isValid: false, message: 'PIN has already been used' };
            }

            if (new Date() > pin.expiresAt) {
                return { isValid: false, message: 'PIN has expired' };
            }

            // Mark as used immediately for one-time use
            await this.prisma.temporaryPin.update({
                where: { id: pin.id },
                data: { isUsed: true }
            });

            return { isValid: true, pin };
        } catch (error: any) {
            throw new RpcException({ message: `Validation failed: ${error.message}`, status: 500 });
        }
    }
}
