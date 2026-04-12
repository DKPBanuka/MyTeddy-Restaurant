import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class StaffService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({
            select: { 
                id: true, 
                name: true, 
                role: true, 
                email: true,
                permissions: true,
                createdAt: true 
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async create(data: { name: string; role: Role; pin: string; email?: string; password?: string; permissions?: string[] }) {
        if (!data.pin || data.pin.length < 4) {
            throw new BadRequestException('PIN must be at least 4 digits');
        }

        const existingPin = await this.prisma.user.findUnique({ where: { pin: data.pin } });
        if (existingPin) {
            throw new BadRequestException('This PIN is already in use by another user');
        }

        const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;

        return this.prisma.user.create({
            data: {
                name: data.name,
                role: data.role,
                pin: data.pin,
                email: data.email,
                password: hashedPassword,
                permissions: data.permissions || [],
            },
            select: { id: true, name: true, role: true, email: true, permissions: true }
        });
    }

    async update(id: string, updateData: { name?: string; role?: Role; pin?: string; email?: string; password?: string; permissions?: string[] }) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        if (updateData.pin) {
            const existingPin = await this.prisma.user.findUnique({ where: { pin: updateData.pin } });
            if (existingPin && existingPin.id !== id) {
                throw new BadRequestException('This PIN is already in use by another user');
            }
        }

        const data: any = { ...updateData };
        if (updateData.password) {
            data.password = await bcrypt.hash(updateData.password, 10);
        }

        return this.prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, role: true, email: true, permissions: true }
        });
    }

    async delete(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        if (user.role === 'ADMIN') {
            const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                throw new BadRequestException('Cannot delete the last existing administrator.');
            }
        }

        return this.prisma.user.delete({ where: { id } });
    }
}

