import { Controller, Get, Patch, Body, Param, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

@Controller('role-permissions')
export class RolePermissionsController {
    constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) { }

    @Get()
    async getPermissions() {
        try {
            return await firstValueFrom(
                this.authClient.send({ cmd: 'get_role_permissions' }, {}).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Error fetching role permissions',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Patch(':role')
    async updatePermissions(@Param('role') role: string, @Body('permissions') permissions: string[]) {
        try {
            return await firstValueFrom(
                this.authClient.send({ cmd: 'update_role_permissions' }, { role, permissions }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Error updating role permissions',
            }, HttpStatus.BAD_REQUEST);
        }
    }
}
