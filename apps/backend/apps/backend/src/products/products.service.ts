import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
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
}
