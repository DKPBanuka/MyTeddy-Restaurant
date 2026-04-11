import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditLogService } from './audit-log.service';

@Module({
  providers: [PrismaService, AuditLogService],
  exports: [PrismaService, AuditLogService],
})
export class PrismaModule {}
