import { Controller, Post, Get, Patch, Delete, Body, Param, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, catchError, throwError } from 'rxjs';

@Controller('inventory')
export class InventoryGatewayController {
    constructor(@Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy) { }

    private async callService(cmd: string, payload: any = {}) {
        try {
            return await firstValueFrom(
                this.inventoryClient.send({ cmd }, payload).pipe(
                    catchError(error => throwError(() => new RpcException(error)))
                )
            );
        } catch (error: any) {
            throw new HttpException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                error: error.message || `Microservice error calling ${cmd}`,
            }, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // --- Ingredients ---
    @Get('ingredients')
    async getIngredients() {
        return this.callService('get_ingredients');
    }

    @Post('ingredients')
    async createIngredient(@Body() data: any) {
        return this.callService('create_ingredient', data);
    }

    @Patch('ingredients/:id')
    async updateIngredient(@Param('id') id: string, @Body() data: any) {
        return this.callService('update_ingredient', { id, data });
    }

    @Delete('ingredients/:id')
    async deleteIngredient(@Param('id') id: string) {
        return this.callService('delete_ingredient', id);
    }

    // --- Retail Stock ---
    @Get('retail')
    async getRetailStock() {
        return this.callService('get_retail_stock');
    }

    @Post('retail')
    async createRetailStock(@Body() data: any) {
        return this.callService('create_retail_stock', data);
    }

    @Patch('retail/:id')
    async updateRetailStock(@Param('id') id: string, @Body() data: any) {
        return this.callService('update_retail_stock', { id, data });
    }

    @Delete('retail/:id')
    async deleteRetailStock(@Param('id') id: string) {
        return this.callService('delete_retail_stock', id);
    }

    // --- Recipe BOM ---
    @Get('bom')
    async getRecipeBOMs() {
        return this.callService('get_recipe_boms');
    }

    @Post('bom')
    async createRecipeBOM(@Body() data: any) {
        return this.callService('create_recipe_bom', data);
    }

    @Delete('bom/:id')
    async deleteRecipeBOM(@Param('id') id: string) {
        return this.callService('delete_recipe_bom', id);
    }
}
