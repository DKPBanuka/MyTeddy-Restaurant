import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, userId: string, details: any = {}) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          action,
          userId,
          details,
        },
      });
    } catch (error) {
      console.error('AuditLogService.log FAILED:', error);
      // We don't want to throw and break the main flow just because logging failed
    }
  }
}
