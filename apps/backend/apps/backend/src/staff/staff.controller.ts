import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Role } from '@prisma/client';

@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Get()
    findAll() {
        return this.staffService.findAll();
    }

    @Post()
    create(@Body() data: { name: string; role: Role; pin: string; email?: string }) {
        return this.staffService.create(data);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: { name?: string; role?: Role; pin?: string; email?: string }) {
        return this.staffService.update(id, data);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.staffService.delete(id);
    }
}
