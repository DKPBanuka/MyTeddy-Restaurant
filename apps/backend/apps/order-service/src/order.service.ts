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

                // Daily Sequential Numbering: INV-YYYYMMDD-XXXX
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const dateStr = `${year}${month}${day}`;

                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);

                const todayCount = await tx.order.count({
                    where: {
                        createdAt: {
                            gte: startOfDay,
                        },
                    },
                });

                const sequence = String(todayCount + 1).padStart(4, '0');
                const invoiceNumber = `INV-${dateStr}-${sequence}`;
                const orderNumber = `ORD-${dateStr}-${sequence}`;

                const order = await tx.order.create({
                    data: {
                        orderNumber,
                        invoiceNumber,
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
                            create: items.map((item: any) => {
                                const basePrice = Number(item.unitPrice || 0);
                                const quantity = Number(item.quantity || 1);
                                return {
                                    productId: item.productId || null,
                                    packageId: item.packageId || null,
                                    quantity: quantity,
                                    unitPrice: basePrice,
                                    subtotal: basePrice * quantity,
                                    notes: item.notes || null,
                                    sizeId: item.sizeId || null,
                                    addonIds: item.addonIds || [],
                                };
                            }),
                        },
                    },
                    include: { 
                        orderItems: {
                            include: {
                                product: true,
                                package: true,
                                size: true
                            }
                        } 
                    },
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
                            create: updateData.items.map((item: any) => {
                                const basePrice = Number(item.unitPrice || 0);
                                const quantity = Number(item.quantity || 1);
                                return {
                                    productId: item.productId || null,
                                    packageId: item.packageId || null,
                                    quantity: quantity,
                                    unitPrice: basePrice,
                                    subtotal: basePrice * quantity,
                                    notes: item.notes || null,
                                    sizeId: item.sizeId || null,
                                    addonIds: item.addonIds || [],
                                };
                            }),
                        },
                    },
                    include: { 
                        orderItems: {
                            include: {
                                product: true,
                                package: true,
                                size: true
                            }
                        } 
                    },
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
                include: { 
                    orderItems: {
                        include: {
                            product: true,
                            package: true,
                            size: true
                        }
                    } 
                },
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
                orderItems: order.orderItems.filter(item => item.product && item.product.type === 'FOOD')
            })).filter(order => order.orderItems.length > 0);

            return kitchenOrders;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async getTableStatus() {
        try {
            const totalTables = 12;
            const tables = Array.from({ length: totalTables }, (_, i) => ({
                tableNo: (i + 1).toString(),
                status: 'AVAILABLE',
                orderId: null as string | null,
            }));

            const pendingOrders = await this.prisma.order.findMany({
                where: {
                    status: 'PENDING',
                    orderType: 'DINE_IN',
                    tableNumber: { not: null }
                },
                select: {
                    id: true,
                    tableNumber: true
                }
            });

            pendingOrders.forEach(order => {
                const tableIndex = tables.findIndex(t => t.tableNo === order.tableNumber);
                if (tableIndex !== -1) {
                    tables[tableIndex].status = 'OCCUPIED';
                    tables[tableIndex].orderId = order.id;
                }
            });

            return tables;
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

    async getOrders(query: any) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                status, 
                paymentStatus, 
                search, 
                startDate, 
                endDate 
            } = query;

            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const where: any = {};
            if (status) where.status = status;
            if (paymentStatus) where.paymentStatus = paymentStatus;
            
            if (search) {
                where.OR = [
                    { invoiceNumber: { contains: search, mode: 'insensitive' } },
                    { customerName: { contains: search, mode: 'insensitive' } },
                    { tableNumber: { contains: search, mode: 'insensitive' } },
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
                    include: {
                        orderItems: {
                            include: {
                                product: true,
                                package: true,
                                size: true
                            }
                        },
                        user: { select: { name: true, role: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take,
                }),
                this.prisma.order.count({ where }),
            ]);

            return {
                orders,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / take),
            };
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async getReportsSummary(query: any = {}) {
        try {
            const { startDate, endDate } = query;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const filterWhere: any = { status: 'COMPLETED' };
            if (startDate || endDate) {
                filterWhere.createdAt = {};
                if (startDate) filterWhere.createdAt.gte = new Date(startDate);
                if (endDate) filterWhere.createdAt.lte = new Date(endDate);
            }

            // 1. Core Metrics
            const revenueAggr = await this.prisma.order.aggregate({
                _sum: { totalAmount: true },
                _count: { id: true },
                _avg: { totalAmount: true },
                where: filterWhere,
            });

            // Today's Revenue (Special card always shows today)
            const todayRevenueAggr = await this.prisma.order.aggregate({
                _sum: { totalAmount: true },
                where: { status: 'COMPLETED', createdAt: { gte: today } },
            });

            // 2. Payment Method Split
            const paymentMethods = await this.prisma.order.groupBy({
                by: ['paymentMethod'],
                _sum: { totalAmount: true },
                where: filterWhere,
            });

            // 3. Category Revenue & Top Sellers
            // We need orderItems for this. 
            // Warning: findMany without pagination can be slow if there are many orders.
            // But for a dashboard summary, it's often necessary unless we have an aggregation table.
            const orderItems = await this.prisma.orderItem.findMany({
                where: { order: filterWhere },
                include: { product: { include: { category: true } } },
            });

            const categoryMap: Record<string, number> = {};
            const productSales: Record<string, { name: string, quantity: number }> = {};
            let totalDiscounts = 0;

            for (const item of orderItems) {
                const categoryName = item.product?.category?.name || 'Uncategorized';
                categoryMap[categoryName] = (categoryMap[categoryName] || 0) + Number(item.subtotal);

                if (item.productId) {
                    if (!productSales[item.productId]) {
                        productSales[item.productId] = { name: item.product?.name || 'Unknown', quantity: 0 };
                    }
                    productSales[item.productId].quantity += item.quantity;
                }
            }

            // 4. Hourly Heatmap (Orders by hour)
            const ordersForHeatmap = await this.prisma.order.findMany({
                where: filterWhere,
                select: { createdAt: true, totalAmount: true }
            });

            const hourlyMap: Record<number, number> = {};
            for (let i = 0; i < 24; i++) hourlyMap[i] = 0;
            
            ordersForHeatmap.forEach(o => {
                const hour = new Date(o.createdAt).getHours();
                hourlyMap[hour] += Number(o.totalAmount);
            });

            const hourlyData = Object.keys(hourlyMap).map(dayHour => ({
                hour: `${dayHour}:00`,
                revenue: hourlyMap[Number(dayHour)]
            }));

            // 5. Party Bookings Summary
            const partyWhere: any = { status: { in: ['CONFIRMED', 'COMPLETED'] } };
            if (startDate || endDate) {
                partyWhere.eventDate = {};
                if (startDate) partyWhere.eventDate.gte = new Date(startDate);
                if (endDate) partyWhere.eventDate.lte = new Date(endDate);
            }
            const partyStats = await this.prisma.partyBooking.aggregate({
                _count: { id: true },
                _sum: { totalAmount: true, advancePaid: true },
                where: partyWhere
            });

            // 6. Customer Insights (New vs Returning)
            const uniqueCustomers = await this.prisma.order.groupBy({
                by: ['customerId'],
                where: { ...filterWhere, customerId: { not: null } },
            });
            // This is a simplification. Real new vs returning requires historical check.
            const totalCustomers = await this.prisma.customer.count();

            // 7. Average Order Value Trend (Daily)
            const salesTrendMap: Record<string, number> = {};
            ordersForHeatmap.forEach(order => {
                const dateStr = order.createdAt.toISOString().split('T')[0];
                salesTrendMap[dateStr] = (salesTrendMap[dateStr] || 0) + Number(order.totalAmount);
            });

            const salesTrend = Object.keys(salesTrendMap).sort().map(date => ({
                date: date.substring(5),
                revenue: salesTrendMap[date]
            }));

            return {
                todayRevenue: Number(todayRevenueAggr._sum.totalAmount || 0),
                totalRevenue: Number(revenueAggr._sum.totalAmount || 0),
                totalOrders: revenueAggr._count.id,
                averageOrderValue: Number(revenueAggr._avg.totalAmount || 0),
                paymentMethodSplit: paymentMethods.map(pm => ({
                    name: pm.paymentMethod || 'OTHER',
                    value: Number(pm._sum.totalAmount || 0)
                })),
                categoryRevenue: Object.entries(categoryMap).map(([name, value]) => ({ name, value })),
                hourlyData,
                topSellers: Object.values(productSales)
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 5),
                partyStats: {
                    count: partyStats._count.id,
                    totalValue: Number(partyStats._sum.totalAmount || 0),
                    advanceCollected: Number(partyStats._sum.advancePaid || 0)
                },
                customerStats: {
                    totalCustomers,
                    activeCustomers: uniqueCustomers.length
                },
                salesTrend,
                refundImpact: 0 // Would require dedicated refund tracking table or mapping field
            };

        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }
}
