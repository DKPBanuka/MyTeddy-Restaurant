import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @MessagePattern({ cmd: 'validate_pin' })
    async login(pin: string) {
        return this.authService.login(pin);
    }

    @MessagePattern({ cmd: 'login_password' })
    async loginPassword(data: { emailOrName: string; password: string }) {
        return this.authService.loginByPassword(data);
    }


    @MessagePattern({ cmd: 'create_temp_pin' })
    async createTempPin(data: { adminId: string }) {
        return this.authService.generateTemporaryPin(data.adminId);
    }

    @MessagePattern({ cmd: 'validate_temp_pin' })
    async validateTempPin(data: { code: string }) {
        return this.authService.validateTemporaryPin(data.code);
    }
}
