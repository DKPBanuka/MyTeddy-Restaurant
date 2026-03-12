import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(categoryId?: string) {
        return this.prisma.product.findMany({
            where: {
                categoryId: categoryId || undefined,
            },
            include: {
                category: true,
                retailStock: true,
                recipeBOMs: {
                    include: {
                        ingredient: true,
                    }
                },
            },
        });
    }

    async create(data: { name: string; price: number; type: any; description?: string; imageUrl?: string; isActive?: boolean; categoryId?: string }) {
        return this.prisma.product.create({
            data: {
                name: data.name,
                price: data.price,
                type: data.type,
                description: data.description,
                imageUrl: data.imageUrl,
                isActive: data.isActive ?? true,
                categoryId: data.categoryId,
            }
        });
    }

    async update(id: string, data: any) {
        return this.prisma.product.update({
            where: { id },
            data
        });
    }

    async remove(id: string) {
        try {
            return await this.prisma.product.delete({
                where: { id }
            });
        } catch (error) {
            // Fallback to soft delete if there are foreign key constraints (e.g. order items)
            return await this.prisma.product.update({
                where: { id },
                data: { isActive: false }
            });
        }
    }
}
