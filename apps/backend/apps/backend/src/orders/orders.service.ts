import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './orders.controller';
import { ProductType } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    private generateInvoiceNumber(): string {
        const now = new Date();
        const yyyymmdd = now.toISOString().split('T')[0].replace(/-/g, '');
        const random = Math.floor(1000 + Math.random() * 9000);
        return `INV-${yyyymmdd}-${random}`;
    }

    async getOrders(query: { page?: number; limit?: number; status?: string; paymentStatus?: string; search?: string; startDate?: string; endDate?: string }) {
        const { page = 1, limit = 10, status, paymentStatus, search, startDate, endDate } = query;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                { customerPhone: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: Number(limit),
                include: { orderItems: { include: { product: true, package: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            orders,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        };
    }

    async refundOrder(id: string, reason: string) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        return this.prisma.order.update({
            where: { id },
            data: {
                paymentStatus: 'REFUNDED',
                status: 'CANCELLED',
                refundReason: reason
            },
            include: { orderItems: true }
        });
    }

    private async generateDailyOrderNumbers(tx: any) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find the latest order of the day to get the next token number
        const lastOrderToday = await tx.order.findFirst({
            where: {
                createdAt: {
                    gte: startOfDay
                }
            },
            orderBy: {
                tokenNumber: 'desc'
            }
        });

        const nextToken = (lastOrderToday?.tokenNumber || 0) + 1;
        
        // Format: INV-YYMMDD-XXXX
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const sequence = nextToken.toString().padStart(4, '0');
        
        const invoiceNumber = `INV-${year}${month}${day}-${sequence}`;
        
        return { tokenNumber: nextToken, invoiceNumber };
    }

    async createOrder(createOrderDto: CreateOrderDto) {
        const { items, discount = 0, paymentMethod, paymentStatus, amountReceived, change, orderType, tableNo, customerName, customerPhone, deliveryAddress } = createOrderDto;

        try {
            // Increase timeout to 15s for complex orders with stock deduction
            return await this.prisma.$transaction(async (tx) => {
                // 1. User Lookup
                let user = await tx.user.findFirst({ where: { role: 'CASHIER' } });
                if (!user) {
                    user = await tx.user.findFirst();
                }
                
                if (!user) {
                    throw new BadRequestException('No users found in the system. Please create a user first.');
                }

                // 2. Generate Invoice and Token Numbers
                const { tokenNumber, invoiceNumber } = await this.generateDailyOrderNumbers(tx);
                
                // 3. Pre-process items to calculate totals and gather basic info
                let calculatedSubTotal = 0;
                const itemsToProcess: any[] = [];

                for (const item of items) {
                    let currentItemPrice = 0;
                    let productType: ProductType | null = null;

                    if (item.packageId) {
                        const pkg = await tx.package.findUnique({ where: { id: item.packageId } });
                        if (!pkg) throw new BadRequestException(`Package ${item.packageId} not found`);
                        currentItemPrice = Number(pkg.price || 0);
                    } else if (item.productId) {
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        if (!product) throw new BadRequestException(`Product ${item.productId} not found`);
                        productType = product.type;

                        if (item.sizeId) {
                            const size = await tx.productSize.findUnique({ where: { id: item.sizeId } });
                            if (!size) throw new BadRequestException(`Size ${item.sizeId} not found`);
                            currentItemPrice = Number(size.price || 0);
                        } else {
                            currentItemPrice = Number(product.price || 0);
                        }
                    }

                    // Add Addon Prices (Handling duplicate IDs for multiple quantities)
                    let addonsTotal = 0;
                    if (item.addonIds && item.addonIds.length > 0) {
                        const addons = await tx.globalAddon.findMany({
                            where: { id: { in: item.addonIds } }
                        });
                        const addonPriceMap = new Map(addons.map(a => [a.id, Number(a.price)]));
                        addonsTotal = item.addonIds.reduce((sum, id) => sum + (addonPriceMap.get(id) || 0), 0);
                    }
                    
                    const unitPriceWithAddons = currentItemPrice + addonsTotal;
                    const subtotal = unitPriceWithAddons * item.quantity;
                    calculatedSubTotal += subtotal;

                    itemsToProcess.push({
                        ...item,
                        unitPrice: currentItemPrice,
                        unitPriceWithAddons: unitPriceWithAddons,
                        subtotal: subtotal,
                        productType
                    });
                }

                const grandTotal = Math.max(0, calculatedSubTotal - discount);

                // 4. Create Order Header First
                const order = await tx.order.create({
                    data: {
                        orderNumber: `ORD-${Date.now()}-${tokenNumber}`,
                        invoiceNumber,
                        tokenNumber,
                        subTotal: calculatedSubTotal,
                        discount,
                        grandTotal,
                        totalAmount: grandTotal,
                        userId: user.id,
                        paymentMethod: (paymentMethod as any) || null,
                        paymentStatus: (paymentStatus as any) || 'UNPAID',
                        amountReceived: amountReceived || null,
                        change: change || null,
                        orderType: (orderType as any) || 'TAKEAWAY',
                        tableNumber: tableNo || null,
                        customerName: customerName || null,
                        customerPhone: customerPhone || null,
                        deliveryAddress: deliveryAddress || null,
                    }
                });

                // 5. Create Order Items and Deduct Stock Sequentially
                const createdItems: any[] = [];
                for (const itemData of itemsToProcess) {
                    const orderItem = await tx.orderItem.create({
                        data: {
                            orderId: order.id,
                            productId: itemData.productId || null,
                            packageId: itemData.packageId || null,
                            quantity: itemData.quantity,
                            unitPrice: itemData.unitPrice,
                            priceAtTimeOfSale: itemData.unitPriceWithAddons,
                            subtotal: itemData.subtotal,
                            notes: itemData.notes || null,
                            sizeId: itemData.sizeId || null,
                            addonIds: itemData.addonIds || [],
                        },
                        include: { product: true, package: true }
                    });
                    
                    createdItems.push(orderItem);

                    // 6. Deduct Stock
                    if (itemData.packageId) {
                        const pkg = await tx.package.findUnique({
                            where: { id: itemData.packageId },
                            include: { items: { include: { product: true } } }
                        });
                        if (pkg) {
                            for (const pkgItem of pkg.items) {
                                const totalQty = pkgItem.quantity * itemData.quantity;
                                await this.processStockDeduction(tx, pkgItem.productId, pkgItem.product.type, totalQty);
                            }
                        }
                    } else if (itemData.productId) {
                        await this.processStockDeduction(tx, itemData.productId, itemData.productType, itemData.quantity);
                    }
                }

                return { ...order, orderItems: createdItems };
            }, { timeout: 15000 });
        } catch (error) {
            console.error('Order Creation Failure:', error);
            if (error instanceof BadRequestException) throw error;
            if (error.code === 'P2002') {
                throw new BadRequestException('A unique constraint violation occurred (invoice number already exists).');
            }
            throw new BadRequestException(error.message || 'An internal error occurred while processing your order');
        }
    }


    async getTableStatus() {
        // Fetch all tables with active (PENDING/PREPARING/READY) orders
        const activeOrders = await this.prisma.order.findMany({
            where: {
                orderType: 'DINE_IN',
                paymentStatus: 'UNPAID',
                tableNumber: { not: null },
            },
            select: { id: true, tableNumber: true, status: true },
        });

        // Build a map of tableNo -> { occupied, orderId }
        const tableMap: Record<string, { occupied: boolean; orderId?: string; status?: string }> = {};
        for (let i = 1; i <= 10; i++) {
            tableMap[String(i)] = { occupied: false };
        }

        for (const order of activeOrders) {
            if (order.tableNumber) {
                tableMap[order.tableNumber] = { occupied: true, orderId: order.id, status: order.status };
            }
        }

        return Object.entries(tableMap).map(([tableNo, info]) => ({
            tableNo,
            ...info,
        }));
    }

    async payOrder(id: string, paymentDetails: { method: string; amountReceived?: number; change?: number; discount?: number; grandTotal?: number }) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        return this.prisma.order.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentMethod: paymentDetails.method as any,
                amountReceived: paymentDetails.amountReceived || null,
                change: paymentDetails.change || null,
                discount: paymentDetails.discount ?? order.discount,
                grandTotal: paymentDetails.grandTotal ?? order.grandTotal,
                status: 'COMPLETED',
            },
            include: { orderItems: { include: { product: true } } },
        });
    }


    async updateOrderItems(id: string, body: { items: any[]; totalAmount: number; subTotal?: number; discount?: number; grandTotal?: number }) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        return this.prisma.$transaction(async (tx) => {
            // Fetch prices for snapshotting - process sequentially to ensure transaction integrity
            const itemsWithPrices: any[] = [];
            for (const item of body.items) {
                let currentItemPrice = 0;
                if (item.packageId) {
                    const pkg = await tx.package.findUnique({ where: { id: item.packageId } });
                    currentItemPrice = Number(pkg?.price || 0);
                } else if (item.productId) {
                    if (item.sizeId) {
                        const size = await tx.productSize.findUnique({ where: { id: item.sizeId } });
                        currentItemPrice = Number(size?.price || 0);
                    } else {
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        currentItemPrice = Number(product?.price || 0);
                    }
                }
                itemsWithPrices.push({ ...item, price: currentItemPrice });
            }

            // Delete existing items and re-create
            await tx.orderItem.deleteMany({ where: { orderId: id } });

            return tx.order.update({
                where: { id },
                data: {
                    totalAmount: body.totalAmount,
                    subTotal: body.subTotal ?? body.totalAmount,
                    discount: body.discount ?? 0,
                    grandTotal: body.grandTotal ?? body.totalAmount,
                    orderItems: {
                        create: itemsWithPrices.map((item) => ({
                            productId: item.productId || null,
                            packageId: item.packageId || null,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            priceAtTimeOfSale: item.price,
                            subtotal: item.price * item.quantity,
                            notes: item.notes || null,
                            sizeId: item.sizeId || null,
                            addonIds: item.addonIds || [],
                        })),
                    },
                },
                include: { orderItems: { include: { product: true, package: true } } },
            });
        }, { timeout: 10000 });
    }

    private async processStockDeduction(tx: any, productId: string, productType: ProductType, quantity: number) {
        if (productType === ProductType.RETAIL) {
            const stock = await tx.retailStock.findUnique({ where: { productId } });
            if (!stock || stock.stockQty < quantity) {
                throw new BadRequestException(`Insufficient stock for product ID ${productId}`);
            }
            await tx.retailStock.update({
                where: { productId },
                data: { stockQty: stock.stockQty - quantity },
            });
        } else if (productType === ProductType.FOOD) {
            const productWithBOM = await tx.product.findUnique({
                where: { id: productId },
                include: { recipeBOMs: true },
            });
            if (!productWithBOM) return; // Or throw error
            if (productWithBOM.recipeBOMs.length === 0) return;

            for (const bom of productWithBOM.recipeBOMs) {
                const requiredQty = Number(bom.quantity) * quantity;
                const ingredient = await tx.ingredient.findUnique({ where: { id: bom.ingredientId } });
                if (!ingredient || Number(ingredient.stockQty) < requiredQty) {
                    throw new BadRequestException(`Insufficient ingredient stock for ID ${bom.ingredientId}`);
                }
                await tx.ingredient.update({
                    where: { id: bom.ingredientId },
                    data: { stockQty: Number(ingredient.stockQty) - requiredQty },
                });
            }
        }
    }
}
