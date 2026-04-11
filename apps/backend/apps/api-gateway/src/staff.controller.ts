import { Controller, Get, Post, Patch, Delete, Body, Param, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { RealTimeGateway } from './real-time.gateway';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { Permissions } from './auth/permissions.decorator';
import { UseGuards } from '@nestjs/common';
import { GetUser } from './auth/get-user.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('STAFF_MANAGE')
export class StaffGatewayController {
    constructor(
        @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
        private readonly realTime: RealTimeGateway
    ) { }

    @Get()
    async getStaff() {
        try {
            const result = await firstValueFrom(
                this.authClient.send({ cmd: 'get_staff' }, {}).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Error fetching staff',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post()
    async createStaff(@Body() createStaffDto: any) {
        try {
            const result = await firstValueFrom(
                this.authClient.send({ cmd: 'create_staff' }, createStaffDto).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            this.realTime.emit('STAFF_UPDATED', result);
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Error creating staff member',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Patch(':id')
    async updateStaff(@Param('id') id: string, @Body() updateStaffDto: any) {
        try {
            const result = await firstValueFrom(
                this.authClient.send({ cmd: 'update_staff' }, { id, updateData: updateStaffDto }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            this.realTime.emit('STAFF_UPDATED', { id });
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Error updating staff member',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Delete(':id')
    async deleteStaff(@Param('id') id: string) {
        try {
            const result = await firstValueFrom(
                this.authClient.send({ cmd: 'delete_staff' }, id).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            this.realTime.emit('STAFF_UPDATED', { id });
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Error deleting staff member',
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @Post('generate-auth-pin')
    async generateAuthPin(@GetUser('id') adminId: string) {
        try {
            const result = await firstValueFrom(
                this.authClient.send({ cmd: 'create_temp_pin' }, { adminId }).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.BAD_REQUEST,
                error: error.message || 'Error generating auth pin',
            }, HttpStatus.BAD_REQUEST);
        }
    }
}
