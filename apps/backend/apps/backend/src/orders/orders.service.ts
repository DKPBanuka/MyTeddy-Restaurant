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

    async refundOrder(id: string) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        return this.prisma.order.update({
            where: { id },
            data: {
                paymentStatus: 'REFUNDED',
                status: 'CANCELLED'
            },
            include: { orderItems: true }
        });
    }

    async createOrder(createOrderDto: CreateOrderDto) {
        const { items, discount = 0, paymentMethod, paymentStatus, amountReceived, change, orderType, tableNo, customerName, customerPhone, deliveryAddress } = createOrderDto;

        return this.prisma.$transaction(async (tx) => {
            const cashier = await tx.user.findFirst({ where: { role: 'CASHIER' } });
            if (!cashier) throw new BadRequestException('No cashier found to process order');

            const invoiceNumber = this.generateInvoiceNumber();
            let calculatedSubTotal = 0;

            // Pre-process items to get snapshot prices
            const itemsWithPrices = await Promise.all(items.map(async (item) => {
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
                
                const subtotal = currentItemPrice * item.quantity;
                calculatedSubTotal += subtotal;

                return {
                    ...item,
                    snapshotPrice: currentItemPrice,
                    itemSubtotal: subtotal
                };
            }));

            const grandTotal = calculatedSubTotal - discount;

            const order = await tx.order.create({
                data: {
                    orderNumber: `ORD-${Date.now()}`,
                    invoiceNumber,
                    subTotal: calculatedSubTotal,
                    discount,
                    grandTotal,
                    totalAmount: grandTotal, // for backward compatibility if used in UI
                    userId: cashier.id,
                    paymentMethod: (paymentMethod as any) || null,
                    paymentStatus: (paymentStatus as any) || 'UNPAID',
                    amountReceived: amountReceived || null,
                    change: change || null,
                    orderType: (orderType as any) || 'TAKEAWAY',
                    tableNumber: tableNo || null,
                    customerName: customerName || null,
                    customerPhone: customerPhone || null,
                    deliveryAddress: deliveryAddress || null,
                    orderItems: {
                        create: itemsWithPrices.map((item) => ({
                            productId: item.productId || null,
                            packageId: item.packageId || null,
                            quantity: item.quantity,
                            unitPrice: item.snapshotPrice,
                            priceAtTimeOfSale: item.snapshotPrice,
                            subtotal: item.itemSubtotal,
                            notes: item.notes || null,
                            sizeId: item.sizeId || null,
                            addonIds: item.addonIds || [],
                        })),
                    },
                },
                include: { orderItems: { include: { product: true, package: true } } },
            });

            // Stock deduction logic remains the same
            for (const item of items) {
                if (item.packageId) {
                    const pkg = await tx.package.findUnique({
                        where: { id: item.packageId },
                        include: { items: { include: { product: true } } }
                    });
                    if (pkg) {
                        for (const pkgItem of pkg.items) {
                            const totalQty = pkgItem.quantity * item.quantity;
                            await this.processStockDeduction(tx, pkgItem.productId, pkgItem.product.type, totalQty);
                        }
                    }
                } else if (item.productId) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (product) {
                        await this.processStockDeduction(tx, item.productId, product.type, item.quantity);
                    }
                }
            }

            return order;
        });
    }

    async getPendingOrders() {
        return this.prisma.order.findMany({
            where: {
                status: { in: ['READY'] },
                paymentStatus: 'UNPAID',
            },
            include: { orderItems: { include: { product: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }

    async getKitchenOrders() {
        return this.prisma.order.findMany({
            where: {
                status: { in: ['PENDING', 'PREPARING', 'READY'] },
            },
            include: { 
                orderItems: { 
                    include: { 
                        product: true,
                        package: true
                    } 
                } 
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async getTableStatus() {
        // Fetch all tables with active (PENDING/PREPARING/READY) orders
        const activeOrders = await this.prisma.order.findMany({
            where: {
                orderType: 'DINE_IN',
                status: { in: ['PENDING', 'PREPARING', 'READY'] },
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

    async updateOrderStatus(id: string, status: string) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        return this.prisma.order.update({
            where: { id },
            data: { status: status as any },
            include: { orderItems: { include: { product: true } } },
        });
    }

    async updateOrderItems(id: string, body: { items: any[]; totalAmount: number; subTotal?: number; discount?: number; grandTotal?: number }) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        return this.prisma.$transaction(async (tx) => {
            // Fetch prices for snapshotting
            const itemsWithPrices = await Promise.all(body.items.map(async (item) => {
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
                return { ...item, price: currentItemPrice };
            }));

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
        });
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
