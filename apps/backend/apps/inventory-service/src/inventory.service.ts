import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RpcException } from '@nestjs/microservices';

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
        // Assume data contains productId OR base product info
        // Simple case: We just create the retail stock if the product exists
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

        // Complex case: User adding entirely new Retail product from Inventory Dashboard
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
        // Update both Product and RetailStock natively via Prisma nested writes where possible or transaction
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
                if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl; // can be set to null explicitly

                await tx.product.update({
                    where: { id: stock.productId },
                    data: updateData
                });
            }

            return tx.retailStock.findUnique({ where: { id }, include: { product: true } });
        });
    }

    async deleteRetailStock(id: string) {
        // Because RetailStock belongs to Product, deleting the Product cascades to RetailStock.
        // We delete the root product.
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
            throw new RpcException({ message: error.message, status: 400 });
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
}
