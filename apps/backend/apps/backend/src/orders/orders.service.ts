import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './orders.controller';
import { ProductType } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) { }

    async createOrder(createOrderDto: CreateOrderDto) {
        const { items, totalAmount } = createOrderDto;

        return this.prisma.$transaction(async (tx) => {
            // Create user UUID since the seed assigns email or we assume a generic cashier
            const cashier = await tx.user.findFirst({ where: { role: 'CASHIER' } });
            if (!cashier) throw new BadRequestException('No cashier found to process order');

            // 1. Create the order
            const order = await tx.order.create({
                data: {
                    orderNumber: `ORD-${Date.now()}`,
                    totalAmount,
                    userId: cashier.id,
                    orderItems: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: 0, // Should be fetched from product price ideally
                            subtotal: 0,
                        })),
                    },
                },
                include: { orderItems: true },
            });

            // 2. Process deductions for each item
            for (const item of items) {
                if (item.type === ProductType.RETAIL) {
                    const stock = await tx.retailStock.findUnique({
                        where: { productId: item.productId },
                    });

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

                        const ingredient = await tx.ingredient.findUnique({
                            where: { id: bom.ingredientId },
                        });

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
}
