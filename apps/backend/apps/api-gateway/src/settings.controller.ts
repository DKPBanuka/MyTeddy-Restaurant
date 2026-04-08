import { Controller, Get, Patch, Body } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { RealTimeGateway } from './real-time.gateway';

@Controller('settings')
export class SettingsController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly realTime: RealTimeGateway
    ) {}

    @Get()
    async getSettings() {
        let settings = await this.prisma.restaurantSettings.findFirst();
        if (!settings) {
            settings = await this.prisma.restaurantSettings.create({
                data: {
                    restaurantName: 'MyTeddy Restaurant',
                    address: '123, Galle Road, Colombo',
                    phone: '+94 11 234 5678',
                    currencySymbol: 'Rs.',
                    taxRate: 0,
                    receiptFooter: 'THANK YOU! COME AGAIN',
                },
            });
        }
        return settings;
    }

    @Patch()
    async updateSettings(@Body() dto: any) {
        const settings = await this.getSettings();
        const result = await this.prisma.restaurantSettings.update({
            where: { id: settings.id },
            data: dto,
        });
        this.realTime.emit('SETTING_UPDATED', result);
        return result;
    }
}
