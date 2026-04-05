import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ProductsService {
    private readonly logger = new Logger(ProductsService.name);
    private supabase;

    constructor(private readonly prisma: PrismaService) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
        }
    }

    private async deleteSupabaseFile(imageUrl: string | null) {
        if (!imageUrl || !this.supabase || !imageUrl.includes('supabase.co')) return;

        try {
            // Extract filename from URL (e.g. .../product-images/1712345-pizza.png -> 1712345-pizza.png)
            const parts = imageUrl.split('/');
            const fileName = parts[parts.length - 1];

            if (fileName) {
                const { error } = await this.supabase.storage
                    .from('product-images')
                    .remove([fileName]);

                if (error) {
                    this.logger.error(`Failed to delete file from Supabase: ${fileName}`, error.message);
                } else {
                    this.logger.log(`Successfully deleted file from Supabase: ${fileName}`);
                }
            }
        } catch (error) {
            this.logger.error('Error during Supabase file deletion:', error);
        }
    }

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
        // Fetch current product to check if image is being replaced
        const currentProduct = await this.prisma.product.findUnique({ where: { id } });

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

        const updated = await this.prisma.product.update({
            where: { id },
            data: updateData,
            include: { category: true, sizes: true }
        });

        // Cleanup Supabase if image was changed or removed
        if (currentProduct?.imageUrl && currentProduct.imageUrl !== data.imageUrl) {
            await this.deleteSupabaseFile(currentProduct.imageUrl);
        }

        return updated;
    }

    async remove(id: string) {
        // Fetch product before deletion to get image URL
        const product = await this.prisma.product.findUnique({ where: { id } });

        try {
            const deleted = await this.prisma.product.delete({
                where: { id }
            });
            
            // Delete from Supabase if deletion from DB was successful
            if (product?.imageUrl) {
                await this.deleteSupabaseFile(product.imageUrl);
            }
            
            return deleted;
        } catch (error) {
            // Fallback to soft delete if there are foreign key constraints
            return await this.prisma.product.update({
                where: { id },
                data: { isActive: false }
            });
        }
    }
}
