import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

@Injectable()
export class OrderService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    ) { }

    async createOrder(createOrderDto: any) {
        const {
            items,
            totalAmount,
            paymentMethod,
            amountReceived,
            change,
            paymentStatus,
            orderType,
            tableNo,
            customerName,
            customerPhone,
            deliveryAddress
        } = createOrderDto;

        // Generate short, readable TokenID based on Order Type
        let tokenId: string | null = null;
        if (orderType === 'TAKEAWAY' || orderType === 'DELIVERY') {
            const prefix = orderType === 'TAKEAWAY' ? 'T' : 'D';
            const randomNum = Math.floor(100 + Math.random() * 900); // e.g., 452
            tokenId = `${prefix}-${randomNum}`;
        }

        // SAGA Step 1: Deduct Stock via Inventory Microservice
        try {
            await firstValueFrom(
                this.inventoryClient.send({ cmd: 'deduct_stock' }, items).pipe(
                    catchError((error) => throwError(() => new RpcException(error)))
                )
            );
        } catch (error: any) {
            const errPayload = error.getError && typeof error.getError === 'function' ? error.getError() : error;
            throw new RpcException(errPayload);
        }

        // SAGA Step 2: Create Order Locally
        try {
            return await this.prisma.$transaction(async (tx) => {
                const cashier = await tx.user.findFirst({ where: { role: 'CASHIER' } });
                if (!cashier) throw new Error('No cashier found to process order');

                const order = await tx.order.create({
                    data: {
                        orderNumber: `ORD-${Date.now()}`,
                        totalAmount,
                        paymentMethod: paymentMethod || null,
                        amountReceived: amountReceived || null,
                        change: change || null,
                        status: paymentStatus === 'PAID' ? 'COMPLETED' : 'PENDING',
                        paymentStatus: paymentStatus || 'UNPAID',
                        orderType: orderType || 'DINE_IN',
                        tableNumber: tableNo || null,
                        customerName: customerName || null,
                        customerPhone: customerPhone || null,
                        deliveryAddress: deliveryAddress || null,
                        tokenId,
                        userId: cashier.id,
                        orderItems: {
                            create: items.map((item: any) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: 0,
                                subtotal: 0,
                                notes: item.notes || null,
                            })),
                        },
                    },
                    include: { orderItems: true },
                });

                return order;
            });
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async updateOrderItems(id: string, updateData: { items: any[], totalAmount: number }) {
        try {
            // Because stock deduction logic would be complex for updates, we assume in a real system we'd diff it.
            // For this scope, we just update the order items in DB.
            return await this.prisma.$transaction(async (tx) => {
                // Delete existing items
                await tx.orderItem.deleteMany({ where: { orderId: id } });

                // Create new ones
                const order = await tx.order.update({
                    where: { id },
                    data: {
                        totalAmount: updateData.totalAmount,
                        orderItems: {
                            create: updateData.items.map((item: any) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: 0,
                                subtotal: 0,
                                notes: item.notes || null,
                            })),
                        },
                    },
                    include: { orderItems: true },
                });

                return order;
            });
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async payOrder(id: string, paymentDetails: any) {
        try {
            const order = await this.prisma.order.update({
                where: { id },
                data: {
                    paymentMethod: paymentDetails.method,
                    amountReceived: paymentDetails.amountReceived,
                    change: paymentDetails.change,
                    paymentStatus: 'PAID',
                    status: 'COMPLETED', // Move to COMPLETED upon payment
                },
                include: { orderItems: true },
            });
            return order;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async getKitchenOrders() {
        try {
            const orders = await this.prisma.order.findMany({
                where: {
                    status: { in: ['PENDING', 'PREPARING'] as any }
                },
                include: {
                    orderItems: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            });

            // Filter out RETAIL items and orders that have no FOOD items left
            const kitchenOrders = orders.map(order => ({
                ...order,
                orderItems: order.orderItems.filter(item => item.product.type === 'FOOD')
            })).filter(order => order.orderItems.length > 0);

            return kitchenOrders;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async getPendingOrders() {
        try {
            const orders = await this.prisma.order.findMany({
                where: {
                    status: 'PENDING',
                    paymentStatus: 'UNPAID'
                },
                include: {
                    orderItems: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return orders;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async updateOrderStatus(id: string, status: string) {
        try {
            // Note: Prisma Enum for OrderStatus is required here. Assuming ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']
            const updatedOrder = await this.prisma.order.update({
                where: { id },
                data: { status: status as any },
            });
            return updatedOrder;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async getReportsSummary() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            // 1. Total Revenue (Today) from COMPLETED orders
            const todayRevenueAggr = await this.prisma.order.aggregate({
                _sum: { totalAmount: true },
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: today },
                },
            });
            const todayRevenue = Number(todayRevenueAggr._sum.totalAmount || 0);

            // 2. Total Orders & Average Order Value (All-Time COMPLETED)
            const allTimeAggr = await this.prisma.order.aggregate({
                _count: { id: true },
                _avg: { totalAmount: true },
                where: { status: 'COMPLETED' },
            });
            const totalOrders = allTimeAggr._count.id;
            const averageOrderValue = Number(allTimeAggr._avg.totalAmount || 0);

            // 3. Revenue Split (FOOD vs RETAIL) using orderItems from COMPLETED orders
            const orderItems = await this.prisma.orderItem.findMany({
                where: { order: { status: 'COMPLETED' } },
                include: { product: true },
            });

            let foodRevenue = 0;
            let retailRevenue = 0;

            // Map to aggregate top sellers
            const productSales: Record<string, { name: string, quantity: number }> = {};

            for (const item of orderItems) {
                if (item.product.type === 'FOOD') {
                    foodRevenue += Number(item.subtotal);
                } else if (item.product.type === 'RETAIL') {
                    retailRevenue += Number(item.subtotal);
                }

                // Aggregate top sellers 
                if (!productSales[item.productId]) {
                    productSales[item.productId] = { name: item.product.name, quantity: 0 };
                }
                productSales[item.productId].quantity += item.quantity;
            }

            const revenueSplit = [
                { name: 'FOOD', value: foodRevenue },
                { name: 'RETAIL', value: retailRevenue },
            ];

            // 4. Top Sellers
            const topSellers = Object.values(productSales)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            // 5. Sales Trend (Last 7 Days)
            // Group By day using Prisma requires a bit of raw query mapping or application-side grouping
            const recentOrders = await this.prisma.order.findMany({
                where: {
                    status: 'COMPLETED',
                    createdAt: { gte: sevenDaysAgo },
                },
                select: { createdAt: true, totalAmount: true },
            });

            const salesTrendMap: Record<string, number> = {};
            // Initialize last 7 days with 0
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                salesTrendMap[dateStr] = 0;
            }

            recentOrders.forEach(order => {
                const dateStr = order.createdAt.toISOString().split('T')[0];
                if (salesTrendMap[dateStr] !== undefined) {
                    salesTrendMap[dateStr] += Number(order.totalAmount);
                }
            });

            const salesTrend = Object.keys(salesTrendMap).sort().map(date => ({
                date: date.substring(5), // Make it like "02-27"
                revenue: salesTrendMap[date]
            }));

            return {
                todayRevenue,
                totalOrders,
                averageOrderValue,
                revenueSplit,
                salesTrend,
                topSellers,
            };

        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }
}
