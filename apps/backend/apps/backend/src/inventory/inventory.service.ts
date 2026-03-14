import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) { }

    async getProducts() {
        return this.prisma.product.findMany({
            include: {
                retailStock: true,
                recipeBOMs: {
                    include: {
                        ingredient: true,
                    }
                },
            },
        });
    }

    // --- Retail Stock CRUD ---

    async getRetailStock() {
        return this.prisma.retailStock.findMany({
            include: {
                product: true
            },
            orderBy: { product: { name: 'asc' } }
        });
    }

    async createRetailStock(data: any) {
        if (data.productId) {
            return this.prisma.retailStock.create({
                data: {
                    productId: data.productId,
                    stockQty: data.stockQty,
                    supplierDetails: data.supplierDetails
                },
                include: { product: true }
            });
        }

        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    name: data.name,
                    price: data.price,
                    type: 'RETAIL',
                    imageUrl: data.imageUrl || null,
                }
            });
            return tx.retailStock.create({
                data: {
                    productId: product.id,
                    stockQty: data.stockQty,
                    supplierDetails: data.supplierDetails
                },
                include: { product: true }
            });
        });
    }

    async updateRetailStock(id: string, data: any) {
        return this.prisma.$transaction(async (tx) => {
            const stock = await tx.retailStock.update({
                where: { id },
                data: {
                    stockQty: data.stockQty,
                    supplierDetails: data.supplierDetails
                }
            });

            if (data.name || data.price || data.imageUrl !== undefined) {
                const updateData: any = {};
                if (data.name) updateData.name = data.name;
                if (data.price) updateData.price = data.price;
                if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

                await tx.product.update({
                    where: { id: stock.productId },
                    data: updateData
                });
            }

            return tx.retailStock.findUnique({ where: { id }, include: { product: true } });
        });
    }

    async deleteRetailStock(id: string) {
        const stock = await this.prisma.retailStock.findUnique({ where: { id } });
        if (stock) {
            return this.prisma.product.delete({
                where: { id: stock.productId }
            });
        }
        return null;
    }

    // --- BOM CRUD ---
    async getRecipeBOMs() {
        return this.prisma.recipeBOM.findMany({
            include: {
                product: true,
                ingredient: true
            }
        });
    }

    async createRecipeBOM(data: any) {
        return this.prisma.recipeBOM.create({
            data: {
                productId: data.productId,
                ingredientId: data.ingredientId,
                quantity: data.quantity
            },
            include: { product: true, ingredient: true }
        });
    }

    async deleteRecipeBOM(id: string) {
        return this.prisma.recipeBOM.delete({
            where: { id }
        });
    }

    async deductStock(items: any[]) {
        try {
            await this.prisma.$transaction(async (tx) => {
                for (const item of items) {
                    if (item.type === 'RETAIL') {
                        const stock = await tx.retailStock.findUnique({
                            where: { productId: item.productId },
                        });

                        if (!stock || stock.stockQty < item.quantity) {
                            throw new Error(`Insufficient stock for retail product ID ${item.productId}`);
                        }

                        await tx.retailStock.update({
                            where: { productId: item.productId },
                            data: { stockQty: stock.stockQty - item.quantity },
                        });
                    } else if (item.type === 'FOOD') {
                        const productWithBOM = await tx.product.findUnique({
                            where: { id: item.productId },
                            include: { recipeBOMs: true },
                        });

                        if (!productWithBOM) throw new Error(`Food product ID ${item.productId} not found`);
                        if (productWithBOM.recipeBOMs.length === 0) continue;

                        for (const bom of productWithBOM.recipeBOMs) {
                            const requiredQty = Number(bom.quantity) * item.quantity;

                            const ingredient = await tx.ingredient.findUnique({
                                where: { id: bom.ingredientId },
                            });

                            if (!ingredient || Number(ingredient.stockQty) < requiredQty) {
                                throw new Error(`Insufficient ingredient stock for ingredient ID ${bom.ingredientId}`);
                            }

                            await tx.ingredient.update({
                                where: { id: bom.ingredientId },
                                data: { stockQty: Number(ingredient.stockQty) - requiredQty },
                            });
                        }
                    }
                }
            });
            return { success: true };
        } catch (error: any) {
            throw new BadRequestException(error.message);
        }
    }

    // --- Ingredients CRUD ---

    async getIngredients() {
        return this.prisma.ingredient.findMany({
            orderBy: { name: 'asc' }
        });
    }

    async createIngredient(data: any) {
        return this.prisma.ingredient.create({
            data: {
                name: data.name,
                stockQty: data.stockQty,
                unitOfMeasure: data.unitOfMeasure,
                minLevel: data.minLevel,
            }
        });
    }

    async updateIngredient(id: string, data: any) {
        return this.prisma.ingredient.update({
            where: { id },
            data: {
                name: data.name,
                stockQty: data.stockQty,
                unitOfMeasure: data.unitOfMeasure,
                minLevel: data.minLevel,
            }
        });
    }

    async deleteIngredient(id: string) {
        return this.prisma.ingredient.delete({
            where: { id }
        });
    }

    // --- Categories CRUD ---

    async getCategories() {
        return this.prisma.category.findMany();
    }

    async createCategory(data: { name: string }) {
        return this.prisma.category.create({
            data: { name: data.name }
        });
    }

    async updateCategory(id: string, data: { name: string }) {
        return this.prisma.category.update({
            where: { id },
            data: { name: data.name }
        });
    }

    async deleteCategory(id: string) {
        return this.prisma.category.delete({
            where: { id }
        });
    }

    // --- Global Addons CRUD ---
    async getGlobalAddons(categoryId?: string) {
        return this.prisma.globalAddon.findMany({
            where: categoryId ? {
                categories: {
                    some: { id: categoryId }
                }
            } : {},
            include: {
                categories: true
            }
        });
    }

    async createGlobalAddon(data: any) {
        return this.prisma.globalAddon.create({
            data: {
                name: data.name,
                price: data.price,
                categories: data.categoryIds ? {
                    connect: data.categoryIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: {
                categories: true
            }
        });
    }

    async updateGlobalAddon(id: string, data: any) {
        return this.prisma.globalAddon.update({
            where: { id },
            data: {
                name: data.name,
                price: data.price,
                categories: data.categoryIds ? {
                    set: data.categoryIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: {
                categories: true
            }
        });
    }

    async deleteGlobalAddon(id: string) {
        return this.prisma.globalAddon.delete({
            where: { id }
        });
    }

    // --- Packages CRUD ---
    async getPackages() {
        return this.prisma.package.findMany({
            include: {
                items: {
                    include: {
                        product: true,
                        size: true
                    }
                }
            }
        });
    }

    async createPackage(data: any) {
        return this.prisma.package.create({
            data: {
                name: data.name,
                description: data.description,
                price: Number(data.price),
                imageUrl: data.imageUrl,
                isActive: data.isActive ?? true,
                items: {
                    create: data.items?.map((item: any) => ({
                        productId: item.productId,
                        sizeId: item.sizeId || null,
                        quantity: Number(item.quantity) || 1
                    })) || []
                }
            },
            include: {
                items: {
                    include: {
                        product: true,
                        size: true
                    }
                }
            }
        });
    }

    async updatePackage(id: string, data: any) {
        return this.prisma.$transaction(async (tx) => {
            // Remove existing items
            await tx.packageItem.deleteMany({ where: { packageId: id } });

            return tx.package.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    price: data.price !== undefined ? Number(data.price) : undefined,
                    imageUrl: data.imageUrl,
                    isActive: data.isActive,
                    items: {
                        create: data.items?.map((item: any) => ({
                            productId: item.productId,
                            sizeId: item.sizeId || null,
                            quantity: Number(item.quantity) || 1
                        })) || []
                    }
                },
                include: {
                    items: {
                        include: {
                            product: true,
                            size: true
                        }
                    }
                }
            });
        });
    }

    async deletePackage(id: string) {
        return this.prisma.package.delete({
            where: { id }
        });
    }
}
