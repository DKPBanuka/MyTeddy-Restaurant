import { Module, OnModuleInit } from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { RolePermissionsController } from './role-permissions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [RolePermissionsController],
    providers: [RolePermissionsService],
    exports: [RolePermissionsService],
})
export class RolePermissionsModule implements OnModuleInit {
    constructor(private readonly rolePermissionsService: RolePermissionsService) { }

    async onModuleInit() {
        await this.rolePermissionsService.initializeDefaultPermissions();
    }
}
