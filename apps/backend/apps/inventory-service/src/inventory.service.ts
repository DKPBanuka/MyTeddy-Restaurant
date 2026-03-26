import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) { }

    async getProducts(categoryId?: string) {
        return (this.prisma as any).product.findMany({
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

    async createProduct(data: any) {
        return (this.prisma as any).product.create({
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
                        price: s.price,
                        costPrice: s.costPrice || 0
                    })) || []
                }
            },
            include: { category: true, sizes: true }
        });
    }

    async updateProduct(id: string, data: any) {
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

        // Handle variants and addons: Delete existing and recreate for simplicity
        if (data.sizes) {
            updateData.sizes = {
                deleteMany: {},
                create: data.sizes.map((s: any) => ({
                    name: s.name,
                    price: s.price,
                    costPrice: s.costPrice || 0
                }))
            };
        }

        return (this.prisma as any).product.update({
            where: { id },
            data: updateData,
            include: { category: true, sizes: true }
        });
    }

    async deleteProduct(id: string) {
        return this.prisma.product.delete({
            where: { id }
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
                    costPrice: data.costPrice || 0,
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
                    costPrice: data.costPrice || 0,
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
                    costPrice: data.costPrice,
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
                costPrice: data.costPrice || 0,
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
                costPrice: data.costPrice,
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
        return (this.prisma as any).category.findMany();
    }

    async createCategory(data: { name: string }) {
        return (this.prisma as any).category.create({
            data: { name: data.name }
        });
    }

    async updateCategory(id: string, data: { name: string }) {
        return (this.prisma as any).category.update({
            where: { id },
            data: { name: data.name }
        });
    }

    async deleteCategory(id: string) {
        return (this.prisma as any).category.delete({
            where: { id }
        });
    }

    // --- Global Addons CRUD ---
    async getGlobalAddons() {
        return (this.prisma as any).globalAddon.findMany({
            include: {
                categories: true
            }
        });
    }

    async createGlobalAddon(data: any) {
        return (this.prisma as any).globalAddon.create({
            data: {
                name: data.name,
                price: data.price,
                categories: {
                    connect: data.categoryIds?.map((id: string) => ({ id })) || []
                }
            },
            include: { categories: true }
        });
    }

    async updateGlobalAddon(id: string, data: any) {
        return (this.prisma as any).globalAddon.update({
            where: { id },
            data: {
                name: data.name,
                price: data.price,
                categories: {
                    set: data.categoryIds?.map((id: string) => ({ id })) || []
                }
            },
            include: { categories: true }
        });
    }

    async deleteGlobalAddon(id: string) {
        return (this.prisma as any).globalAddon.delete({
            where: { id }
        });
    }

    // --- Packages CRUD ---
    async getPackages() {
        const packages = await (this.prisma as any).package.findMany({
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                retailStock: true
                            }
                        },
                        size: true
                    }
                }
            }
        });

        return packages.map(pkg => {
            const isAllItemsAvailable = pkg.items.every(item => {
                const product = item.product;
                if (!product.isActive) return false;
                if (product.type === 'RETAIL') {
                    return (product.retailStock?.stockQty || 0) >= item.quantity;
                }
                return true;
            });

            return {
                ...pkg,
                isAvailable: pkg.isActive && isAllItemsAvailable
            };
        });
    }

    async createPackage(data: any) {
        try {
            // Filter out items without productId
            const validItems = data.items?.filter((item: any) => item.productId && item.productId !== "") || [];
            
            return await (this.prisma as any).package.create({
                data: {
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    imageUrl: data.imageUrl,
                    isActive: data.isActive ?? true,
                    validFrom: data.validFrom ? new Date(data.validFrom) : null,
                    validUntil: data.validUntil ? new Date(data.validUntil) : null,
                    items: {
                        create: validItems.map((item: any) => ({
                            productId: item.productId,
                            sizeId: item.sizeId || null,
                            quantity: item.quantity || 1
                        }))
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
        } catch (error: any) {
            console.error('Error in createPackage:', error);
            throw new RpcException(error.message || 'Failed to create package');
        }
    }

    async updatePackage(id: string, data: any) {
        try {
            return await (this.prisma as any).$transaction(async (tx: any) => {
                // Update basic package info
                await tx.package.update({
                    where: { id },
                    data: {
                        name: data.name,
                        description: data.description,
                        price: data.price,
                        imageUrl: data.imageUrl,
                        isActive: data.isActive,
                        validFrom: data.validFrom ? new Date(data.validFrom) : (data.validFrom === null ? null : undefined),
                        validUntil: data.validUntil ? new Date(data.validUntil) : (data.validUntil === null ? null : undefined),
                    }
                });

                // Update items: delete existing and recreate
                if (data.items) {
                    await tx.packageItem.deleteMany({
                        where: { packageId: id }
                    });

                    const validItems = data.items.filter((item: any) => item.productId && item.productId !== "");
                    if (validItems.length > 0) {
                        await tx.packageItem.createMany({
                            data: validItems.map((item: any) => ({
                                packageId: id,
                                productId: item.productId,
                                sizeId: item.sizeId || null,
                                quantity: item.quantity || 1
                            }))
                        });
                    }
                }

                return tx.package.findUnique({
                    where: { id },
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
        } catch (error: any) {
            console.error('Error in updatePackage:', error);
            throw new RpcException(error.message || 'Failed to update package');
        }
    }

    async deletePackage(id: string) {
        return (this.prisma as any).package.delete({
            where: { id }
        });
    }

    // --- BI & Valuation ---

    async getInventoryValuation() {
        const ingredients = await this.prisma.ingredient.findMany();
        const retailStock = await this.prisma.retailStock.findMany({
            include: { product: true }
        });

        let totalCost = 0;
        let totalRetail = 0;
        let lowStockCount = 0;

        ingredients.forEach(ing => {
            totalCost += Number(ing.stockQty) * Number(ing.costPrice || 0);
            if (Number(ing.stockQty) <= Number(ing.minLevel)) {
                lowStockCount++;
            }
        });

        retailStock.forEach(stock => {
            totalCost += Number(stock.stockQty) * Number(stock.costPrice || 0);
            totalRetail += Number(stock.stockQty) * Number(stock.product.price || 0);
            // Low stock check for retail items (using minLevel if it were there, but let's use a hardcoded 5 for now or check if it's there)
            // RetailStock doesn't have minLevel yet, let's assume 5
            if (stock.stockQty <= 5) {
                lowStockCount++;
            }
        });

        return {
            totalCost,
            totalRetail,
            potentialProfit: totalRetail - totalCost,
            lowStockCount
        };
    }
}
