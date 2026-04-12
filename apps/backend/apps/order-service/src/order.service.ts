import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { firstValueFrom, lastValueFrom, catchError, throwError } from 'rxjs';
import { SplitCalculationUtil } from './utils/split-calculation.util';
import { CustomersService } from './customers/customers.service';
const fs = require('fs');
const LOG_FILE = './debug_manual.log';

@Injectable()
export class OrderService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly customersService: CustomersService,
        @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    ) { }


    async createOrder(createOrderDto: any) {
        console.log('OrderService.createOrder payload received:', JSON.stringify(createOrderDto, null, 2));
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
            deliveryAddress,
            customerId,
            userId
        } = createOrderDto;

        if (!userId) {
            console.error('OrderService.createOrder: Missing userId in payload!');
            throw new RpcException({ message: 'User identification is required to create an order', status: 400 });
        }

        // Generate short, readable TokenID based on Order Type
        let tokenId: string | null = null;
        if (orderType === 'TAKEAWAY' || orderType === 'DELIVERY') {
            const prefix = orderType === 'TAKEAWAY' ? 'T' : 'D';
            const randomNum = Math.floor(100 + Math.random() * 900); // e.g., 452
            tokenId = `${prefix}-${randomNum}`;
        }

        // SAGA Step 1: Deduct Stock via Inventory Microservice
        console.log('OrderService: [STEP 1] Deducting stock for items:', JSON.stringify(items));
        try {
            await lastValueFrom(
                this.inventoryClient.send({ cmd: 'deduct_stock' }, items).pipe(
                    catchError((error) => {
                        console.error('OrderService: [STEP 1 ERROR] from inventory-service:', error);
                        return throwError(() => new RpcException(error));
                    })
                )
            );
            console.log('OrderService: [STEP 1 SUCCESS] Stock deducted.');
        } catch (error: any) {
            const msg = `[ORDER] Step 1 FAILED: ${JSON.stringify(error)}\n`;
            fs.appendFileSync(LOG_FILE, msg);
            const errPayload = error.getError && typeof error.getError === 'function' ? error.getError() : error;
            throw new RpcException(errPayload);
        }

        // SAGA Step 2: Create Order Locally
        console.log(`OrderService: [STEP 2] Creating order locally for user ID: ${userId}...`);
        try {
            return await this.prisma.$transaction(async (tx) => {

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

                console.log(`OrderService: [STEP 2] Generated Invoice: ${invoiceNumber}`);

                const order = await tx.order.create({
                    data: {
                        id: createOrderDto.id || undefined, // Use provided UUID if exists
                        orderNumber,
                        invoiceNumber,
                        totalAmount,
                        paymentMethod: paymentMethod || null,
                        amountReceived: amountReceived || null,
                        change: change || null,
                        status: paymentStatus === 'PAID' ? OrderStatus.COMPLETED : (paymentStatus === 'PARTIAL' ? OrderStatus.PARTIALLY_PAID : OrderStatus.PENDING),
                        paymentStatus: (paymentStatus as PaymentStatus) || PaymentStatus.UNPAID,
                        orderType: orderType || 'DINE_IN',
                        tableNumber: tableNo || null,
                        customerName: customerName || null,
                        customerPhone: customerPhone || null,
                        deliveryAddress: deliveryAddress || null,
                        subTotal: createOrderDto.subTotal || totalAmount,
                        discount: createOrderDto.discount || 0,
                        grandTotal: createOrderDto.grandTotal || totalAmount,
                        tokenId,
                        userId: userId,
                        customerId: customerId || null,
                        orderItems: {
                            create: items.map((item: any) => {
                                const basePrice = Number(item.unitPrice || 0);
                                const quantity = Number(item.quantity || 1);
                                return {
                                    id: item.id || undefined, // Use provided UUID if exists
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

                // Award points if paid immediately
                if (paymentStatus === 'PAID') {
                    await this.customersService.awardPoints(customerId, Number(totalAmount), tx);
                }

                console.log(`OrderService: [STEP 2 SUCCESS] Order created with ID: ${order.id}`);
                return order;
            });
        } catch (error: any) {
            console.error('OrderService: [STEP 2 ERROR] Prisma create order FAILED:', error);
            const msg = `[ORDER] Step 2 FAILED: ${error.message}\n`;
            fs.appendFileSync(LOG_FILE, msg);
            throw new RpcException({ message: error.message || 'Database Transaction Error', status: 500 });
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
                    },
                    payments: true
                },
            });

            // Award points for full payment
            if (order.customerId) {
                await this.customersService.awardPoints(order.customerId, Number(order.grandTotal));
            }

            return order;
        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }

    async splitPayOrder(id: string, data: { paymentMethod: string; amount: number; paidItemIds: string[]; mode?: 'EQUAL' | 'ITEMS' | 'CUSTOM' }) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id },
                    include: { orderItems: true }
                });

                if (!order) throw new Error('Order not found');

                let splitCalculations: any = null;
                const safePaidItemIds = Array.isArray(data.paidItemIds) ? data.paidItemIds : [];

                if (data.mode === 'ITEMS' || (safePaidItemIds && safePaidItemIds.length > 0)) {
                    const selectedItems = order.orderItems.filter(item => safePaidItemIds.includes(item.id));
                    
                    if (selectedItems.length > 0) {
                        splitCalculations = SplitCalculationUtil.calculateItemSplit(
                            selectedItems.map(i => ({ subtotal: Number(i.subtotal || 0), quantity: Number(i.quantity || 1) })),
                            {
                                subtotal: Number(order.subTotal || 0),
                                grandTotal: Number(order.grandTotal || 0),
                                tax: (Number(order.grandTotal || 0) - Number(order.subTotal || 0) + Number(order.discount || 0)), 
                                serviceCharge: 0,
                                discount: Number(order.discount || 0)
                            }
                        );
                    }
                }

                // 1. Create the payment record
                await tx.orderPayment.create({
                    data: {
                        orderId: id,
                        paymentMethod: data.paymentMethod as any,
                        amount: data.amount,
                        paidItemIds: safePaidItemIds as any,
                        isSplit: true,
                        splitDetails: splitCalculations as any,
                    } as any
                });

                // 2. Aggregate all payments
                const payments = await tx.orderPayment.findMany({
                    where: { orderId: id }
                });

                const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const isFullyPaid = totalPaid >= Number(order.grandTotal) - 0.01; // Allow 1 cent rounding tolerance

                // 4. Update the order status
                const updatedOrder = await tx.order.update({
                    where: { id },
                    data: {
                        status: isFullyPaid ? 'COMPLETED' : 'PARTIALLY_PAID',
                        paymentStatus: isFullyPaid ? 'PAID' : 'PARTIAL',
                        paymentMethod: data.paymentMethod as any,
                    },
                    include: {
                        orderItems: {
                            include: {
                                product: true,
                                package: true,
                                size: true
                            }
                        }
                    }
                });

                // Award points for partial paid amount
                if (order.customerId) {
                    await this.customersService.awardPoints(order.customerId, Number(data.amount), tx);
                }

                return updatedOrder;
            });
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
                    status: { in: ['PENDING', 'PARTIALLY_PAID'] as any },
                    paymentStatus: { in: ['UNPAID', 'PARTIAL'] as any }
                },
                include: {
                    orderItems: {
                        include: {
                            product: true
                        }
                    },
                    payments: true
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
                        payments: true,
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
            const { startDate, endDate, compare } = query;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let currentStart = new Date(startDate || today);
            let currentEnd = endDate ? new Date(endDate) : new Date();
            
            // If no range provided, default to last 7 days
            if (!startDate && !endDate) {
                currentStart = new Date();
                currentStart.setDate(currentStart.getDate() - 7);
                currentStart.setHours(0, 0, 0, 0);
            }

            const filterWhere: any = { 
                status: 'COMPLETED',
                createdAt: { gte: currentStart, lte: currentEnd }
            };

            // Calculate Previous Period for comparison
            let prevStart: Date | null = null;
            let prevEnd: Date | null = null;

            if (compare) {
                const durationMs = currentEnd.getTime() - currentStart.getTime();
                prevEnd = new Date(currentStart);
                prevStart = new Date(currentStart.getTime() - durationMs);
            }

            // 1. Core Metrics (Current Period)
            const revenueAggr = await this.prisma.order.aggregate({
                _sum: { totalAmount: true },
                _count: { id: true },
                _avg: { totalAmount: true },
                where: filterWhere,
            });

            // 1.1 Core Metrics (Previous Period)
            let prevRevenue = 0;
            let prevOrders = 0;
            if (prevStart && prevEnd) {
                const prevAggr = await this.prisma.order.aggregate({
                    _sum: { totalAmount: true },
                    _count: { id: true },
                    where: { status: 'COMPLETED', createdAt: { gte: prevStart, lte: prevEnd } },
                });
                prevRevenue = Number(prevAggr._sum.totalAmount || 0);
                prevOrders = prevAggr._count.id;
            }

            // Calculation helper
            const getGrowth = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Number((((current - previous) / previous) * 100).toFixed(1));
            };

            const currentRevenue = Number(revenueAggr._sum.totalAmount || 0);
            const currentOrders = revenueAggr._count.id;

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
            const orderItems = await this.prisma.orderItem.findMany({
                where: { order: filterWhere },
                include: { product: { include: { category: true } } },
            });

            const categoryMap: Record<string, number> = {};
            const categoryProducts: Record<string, Record<string, { name: string, value: number, quantity: number }>> = {};
            const productSales: Record<string, { name: string, quantity: number }> = {};
            
            for (const item of orderItems) {
                const categoryName = item.product?.category?.name || 'Uncategorized';
                const revenue = Number(item.subtotal);
                
                categoryMap[categoryName] = (categoryMap[categoryName] || 0) + revenue;

                if (!categoryProducts[categoryName]) categoryProducts[categoryName] = {};
                if (item.productId) {
                    if (!categoryProducts[categoryName][item.productId]) {
                        categoryProducts[categoryName][item.productId] = { name: item.product?.name || 'Unknown', value: 0, quantity: 0 };
                    }
                    categoryProducts[categoryName][item.productId].value += revenue;
                    categoryProducts[categoryName][item.productId].quantity += item.quantity;

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
            const partyAgg = await this.prisma.partyBooking.aggregate({
                _count: { id: true },
                _sum: { 
                    totalAmount: true, 
                    advancePaid: true, 
                    guestCount: true,
                    menuTotal: true,
                    hallCharge: true,
                    addonsTotal: true
                },
                where: partyWhere
            });

            // Group by status for breakdown
            const partyStatusGroups = await this.prisma.partyBooking.groupBy({
                by: ['status'],
                _count: { id: true },
                where: startDate || endDate ? { eventDate: partyWhere.eventDate } : {}
            });

            // Forecast (Confirmed future bookings)
            const forecastAgg = await this.prisma.partyBooking.aggregate({
                _sum: { totalAmount: true },
                where: { 
                    status: 'CONFIRMED',
                    eventDate: { gt: new Date() }
                }
            });

            const partyStats = {
                count: partyAgg._count.id,
                totalValue: Number(partyAgg._sum.totalAmount || 0),
                advanceCollected: Number(partyAgg._sum.advancePaid || 0),
                guestCount: Number(partyAgg._sum.guestCount || 0),
                revenueSplit: {
                    menu: Number(partyAgg._sum.menuTotal || 0),
                    hall: Number(partyAgg._sum.hallCharge || 0),
                    addons: Number(partyAgg._sum.addonsTotal || 0)
                },
                forecastedRevenue: Number(forecastAgg._sum.totalAmount || 0),
                statusBreakdown: partyStatusGroups.map(g => ({
                    status: g.status,
                    count: g._count.id
                }))
            };

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

            // 8. Financial Valuations (Executive Hub)
            const ingredients = await this.prisma.ingredient.findMany();
            const retailStock = await this.prisma.retailStock.findMany({
                include: { product: true }
            });

            let inventoryValueCost = 0;
            let inventoryValueRetail = 0;
            let lowStockCount = 0;

            ingredients.forEach(ing => {
                inventoryValueCost += Number(ing.stockQty) * Number((ing as any).costPrice || 0);
                if (Number(ing.stockQty) <= Number(ing.minLevel)) {
                    lowStockCount++;
                }
            });

            retailStock.forEach(stock => {
                inventoryValueCost += Number(stock.stockQty) * Number((stock as any).costPrice || 0);
                inventoryValueRetail += Number(stock.stockQty) * Number(stock.product.price || 0);
                if (stock.stockQty <= 5) lowStockCount++;
            });

            // 9. Expenses (Profit & Loss)
            const expensesAggr = await (this.prisma as any).expense.aggregate({
                _sum: { amount: true },
                where: { date: { gte: currentStart, lte: currentEnd } }
            });
            const totalExpenses = Number(expensesAggr._sum.amount || 0);

            return {
                todayRevenue: Number(todayRevenueAggr._sum.totalAmount || 0),
                totalRevenue: currentRevenue,
                totalOrders: currentOrders,
                averageOrderValue: Number(revenueAggr._avg.totalAmount || 0),
                revenueGrowth: compare ? getGrowth(currentRevenue, prevRevenue) : 0,
                orderGrowth: compare ? getGrowth(currentOrders, prevOrders) : 0,
                prevStart,
                prevEnd,
                paymentMethodSplit: paymentMethods.map(pm => ({
                    name: pm.paymentMethod || 'OTHER',
                    value: Number(pm._sum.totalAmount || 0)
                })),
                categoryRevenue: Object.entries(categoryMap).map(([name, value]) => ({ 
                    name, 
                    value,
                    percent: currentRevenue > 0 ? Number(((value / currentRevenue) * 100).toFixed(1)) : 0,
                    products: Object.values(categoryProducts[name] || {})
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 10)
                })),
                hourlyData,
                topSellers: Object.values(productSales)
                    .sort((a, b) => b.quantity - a.quantity)
                    .slice(0, 5),
                partyStats,
                customerStats: {
                    totalCustomers,
                    activeCustomers: uniqueCustomers.length,
                    customerGrowth: compare ? getGrowth(uniqueCustomers.length, 0) : 0 // Simplified
                },
                salesTrend,
                refundImpact: 0,
                financials: {
                    inventoryValueCost,
                    inventoryValueRetail,
                    potentialProfit: inventoryValueRetail - inventoryValueCost,
                    totalExpenses,
                    netProfit: currentRevenue - totalExpenses,
                    lowStockCount
                }
            };

        } catch (error: any) {
            throw new RpcException({ message: error.message, status: 500 });
        }
    }
}
