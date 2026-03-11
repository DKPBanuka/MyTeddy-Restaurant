import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { createClient } from '@supabase/supabase-js';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    async getAllProducts() {
        return this.productsService.findAll();
    }

    @Post()
    async createProduct(@Body() createData: any) {
        return this.productsService.create(createData);
    }

    @Patch(':id')
    async updateProduct(@Param('id') id: string, @Body() updateData: any) {
        return this.productsService.update(id, updateData);
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: string) {
        return this.productsService.remove(id);
    }

    @Post('upload-image')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: any) {
        if (!file) {
            throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new HttpException('Supabase storage not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

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
