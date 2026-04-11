import { Controller, Post, Body, Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthGatewayController {
    constructor(@Inject('AUTH_SERVICE') private readonly authClient: ClientProxy) { }

    @Post('login')
    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async login(@Body('pin') pin: string) {
        return firstValueFrom(this.authClient.send({ cmd: 'validate_pin' }, pin));
    }

    @Post('login-password')
    async loginPassword(@Body() data: { emailOrName: string; password: string }) {
        return firstValueFrom(this.authClient.send({ cmd: 'login_password' }, data));
    }
}
