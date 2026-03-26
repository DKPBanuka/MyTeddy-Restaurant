import { Controller, Get, Inject, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

@Controller('reports')
export class ReportsGatewayController {
    constructor(@Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy) { }

    @Get('summary')
    async getReportsSummary(@Query() query: any) {
        try {
            const result = await firstValueFrom(
                this.orderClient.send({ cmd: 'get_reports_summary' }, query || {}).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
            return result;
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || 'Microservice error fetching reports summary',
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
