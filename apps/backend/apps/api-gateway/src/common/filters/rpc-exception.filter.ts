import { Catch, ArgumentsHost, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch(RpcException)
export class HttpRpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const error: any = exception.getError();

    // Map RpcException error object to HTTP response
    // Expecting error to be like { message: string, status: number } from microservice
    const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message: message,
    });
  }
}
