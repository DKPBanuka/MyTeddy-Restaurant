import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './orders.controller';
import { ProductType } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async createOrder(createOrderDto: CreateOrderDto) {
        const { items, totalAmount, paymentMethod, paymentStatus, amountReceived, change, orderType, tableNo, customerName, customerPhone, deliveryAddress } = createOrderDto;

        return this.prisma.$transaction(async (tx) => {
            const cashier = await tx.user.findFirst({ where: { role: 'CASHIER' } });
            if (!cashier) throw new BadRequestException('No cashier found to process order');

            const order = await tx.order.create({
                data: {
                    orderNumber: `ORD-${Date.now()}`,
                    totalAmount,
                    userId: cashier.id,
                    paymentMethod: paymentMethod || null,
                    paymentStatus: paymentStatus || 'UNPAID',
                    amountReceived: amountReceived || null,
                    change: change || null,
                    orderType: (orderType as any) || 'TAKEAWAY',
                    tableNumber: tableNo || null,
                    customerName: customerName || null,
                    customerPhone: customerPhone || null,
                    deliveryAddress: deliveryAddress || null,
                    orderItems: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: 0,
                            subtotal: 0,
                        })),
                    },
                },
                include: { orderItems: { include: { product: true } } },
            });

            for (const item of items) {
                if (item.type === ProductType.RETAIL) {
                    const stock = await tx.retailStock.findUnique({ where: { productId: item.productId } });
                    if (!stock || stock.stockQty < item.quantity) {
                        throw new BadRequestException(`Insufficient stock for retail product ID ${item.productId}`);
                    }
                    await tx.retailStock.update({
                        where: { productId: item.productId },
                        data: { stockQty: stock.stockQty - item.quantity },
                    });
                } else if (item.type === ProductType.FOOD) {
                    const productWithBOM = await tx.product.findUnique({
                        where: { id: item.productId },
                        include: { recipeBOMs: true },
                    });
                    if (!productWithBOM) throw new BadRequestException(`Food product ID ${item.productId} not found`);
                    if (productWithBOM.recipeBOMs.length === 0) continue;

                    for (const bom of productWithBOM.recipeBOMs) {
                        const requiredQty = Number(bom.quantity) * item.quantity;
                        const ingredient = await tx.ingredient.findUnique({ where: { id: bom.ingredientId } });
                        if (!ingredient || Number(ingredient.stockQty) < requiredQty) {
                            throw new BadRequestException(`Insufficient ingredient stock for ingredient ID ${bom.ingredientId}`);
                        }
                        await tx.ingredient.update({
                            where: { id: bom.ingredientId },
                            data: { stockQty: Number(ingredient.stockQty) - requiredQty },
                        });
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
                status: { in: ['PENDING', 'PREPARING'] },
            },
            include: { orderItems: { include: { product: true } } },
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

    async payOrder(id: string, paymentDetails: { method: string; amountReceived?: number; change?: number }) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        return this.prisma.order.update({
            where: { id },
            data: {
                paymentStatus: 'PAID',
                paymentMethod: paymentDetails.method,
                amountReceived: paymentDetails.amountReceived || null,
                change: paymentDetails.change || null,
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

    async updateOrderItems(id: string, body: { items: any[]; totalAmount: number }) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException(`Order ${id} not found`);

        // Delete existing items and re-create
        await this.prisma.orderItem.deleteMany({ where: { orderId: id } });

        return this.prisma.order.update({
            where: { id },
            data: {
                totalAmount: body.totalAmount,
                orderItems: {
                    create: body.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: 0,
                        subtotal: 0,
                    })),
                },
            },
            include: { orderItems: { include: { product: true } } },
        });
    }
}
