import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const { phone, email } = createCustomerDto;
    
    if (phone || email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      });
      if (existing) {
        throw new ConflictException('Customer with this phone or email already exists');
      }
    }

    return this.prisma.customer.create({
      data: createCustomerDto,
    });
  }

  async findAll() {
    return this.prisma.customer.findMany();
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, updateCustomerDto: Partial<CreateCustomerDto>) {
    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string) {
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async awardPoints(customerId: string | null, amount: number, prismaInstance: any = this.prisma) {
    console.log(`[LOYALTY] awardPoints called for customer: ${customerId}, amount: ${amount}`);
    if (!customerId || amount <= 0) {
      console.log(`[LOYALTY] Skipping points award. Reason: ${!customerId ? 'No customerId' : 'Amount <= 0'}`);
      return;
    }
    try {
      const pointsToAdd = Math.floor(amount / 100);
      if (pointsToAdd > 0) {
        console.log(`[LOYALTY] Attempting to award ${pointsToAdd} points to customer: ${customerId}`);
        const updated = await prismaInstance.customer.update({
          where: { id: customerId },
          data: { points: { increment: pointsToAdd } }
        });
        console.log(`[LOYALTY] SUCCESS: Awarded ${pointsToAdd} points to ${updated.name}. New Total: ${updated.points}`);
        return updated;
      } else {
        console.log(`[LOYALTY] Amount ${amount} is less than 100. No points awarded.`);
      }
    } catch (error) {
      console.error(`[LOYALTY] ERROR: Failed to award points to customer ${customerId}:`, error);
      // We catch but don't re-throw to prevent failing the entire transaction if loyalty award fails
    }
  }
}
