import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

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

        if (!user) {
            return null;
        }
        return user;
    }

    async login(pin: string) {
        const user = await this.validateUserByPin(pin);
        if (!user) {
            throw new UnauthorizedException('Invalid PIN');
        }

        const payload = { sub: user.id, name: user.name, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            }
        };
    }
}
