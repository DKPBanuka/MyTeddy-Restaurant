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
                sizes: true,
                recipeBOMs: {
                    include: {
                        ingredient: true,
                    }
                },
            },
        });
    }

    async create(data: any) {
        return this.prisma.product.create({
            data: {
                name: data.name,
                price: data.price,
                type: data.type,
                description: data.description,
                imageUrl: data.imageUrl,
                isActive: data.isActive ?? true,
                categoryId: data.categoryId === "" ? null : data.categoryId,
                barcode: data.barcode || null,
                sizes: {
                    create: data.sizes?.map((s: any) => ({
                        name: s.name,
                        price: s.price
                    })) || []
                }
            },
            include: { category: true, sizes: true }
        });
    }

    async update(id: string, data: any) {
        const updateData: any = {
            name: data.name,
            price: data.price,
            type: data.type,
            description: data.description,
            imageUrl: data.imageUrl,
            categoryId: data.categoryId === "" ? null : data.categoryId,
        };

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        if (data.sizes) {
            updateData.sizes = {
                deleteMany: {},
                create: data.sizes.map((s: any) => ({
                    name: s.name,
                    price: s.price
                }))
            };
        }

        return this.prisma.product.update({
            where: { id },
            data: updateData,
            include: { category: true, sizes: true }
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
