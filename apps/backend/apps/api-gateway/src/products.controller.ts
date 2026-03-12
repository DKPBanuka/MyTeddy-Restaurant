import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''; // OR SERVICE_ROLE_KEY if needed. Assuming env holds it.
const supabase = createClient(supabaseUrl, supabaseKey);

@Controller('products')
export class ProductsGatewayController {
    constructor(@Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy) { }

    @Get()
    async getProducts(@Query('categoryId') categoryId?: string) {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'get_products' }, { categoryId }));
    }

    @Post()
    async createProduct(@Body() data: any) {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'create_product' }, data));
    }

    @Patch(':id')
    async updateProduct(@Param('id') id: string, @Body() data: any) {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'update_product' }, { id, data }));
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: string) {
        return firstValueFrom(this.inventoryClient.send({ cmd: 'delete_product' }, id));
    }

    @Post('upload-image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: any) {
        if (!file) {
            throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
        }

        const fileName = `${Date.now()}-${file.originalname}`;

        try {
            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('Supabase upload error:', error);
                throw new Error(error.message);
            }

            const { data: publicData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            return { imageUrl: publicData.publicUrl };
        } catch (error: any) {
            console.error('Upload failed:', error);
            throw new HttpException(
                { status: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Failed to upload image' },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
