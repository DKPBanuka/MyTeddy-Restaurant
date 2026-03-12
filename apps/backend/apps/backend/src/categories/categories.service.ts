import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany();
  }

  async findOne(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
  }

  async create(data: { name: string }) {
    return this.prisma.category.create({
      data,
    });
  }

  async update(id: string, data: { name: string }) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.category.delete({
      where: { id },
    });
  }
}
