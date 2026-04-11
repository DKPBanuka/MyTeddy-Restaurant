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

    @MessagePattern({ cmd: 'get_staff' })
    async getStaff() {
        return this.authService.getStaff();
    }

    @MessagePattern({ cmd: 'create_staff' })
    async createStaff(data: { name: string; role: string; pin: string }) {
        return this.authService.createStaff(data);
    }

    @MessagePattern({ cmd: 'update_staff' })
    async updateStaff(data: { id: string; updateData: { name?: string; role?: string; pin?: string } }) {
        return this.authService.updateStaff(data.id, data.updateData);
    }

    @MessagePattern({ cmd: 'delete_staff' })
    async deleteStaff(id: string) {
        return this.authService.deleteStaff(id);
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
