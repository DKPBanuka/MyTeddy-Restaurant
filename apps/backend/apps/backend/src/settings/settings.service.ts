import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Ensure default settings exist
    await this.getSettings();
  }

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
          serviceCharge: 0,
          packagingCharge: 0,
          receiptFooter: 'THANK YOU! COME AGAIN',
        },
      });
    }

    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const settings = await this.getSettings();
    return this.prisma.restaurantSettings.update({
      where: { id: settings.id },
      data: dto,
    });
  }
}
