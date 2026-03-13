import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get('products')
    async getProducts() {
        return this.inventoryService.getProducts();
    }

    // --- Ingredients ---
    @Get('ingredients')
    async getIngredients() {
        return this.inventoryService.getIngredients();
    }

    @Post('ingredients')
    async createIngredient(@Body() data: any) {
        return this.inventoryService.createIngredient(data);
    }

    @Patch('ingredients/:id')
    async updateIngredient(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateIngredient(id, data);
    }

    @Delete('ingredients/:id')
    async deleteIngredient(@Param('id') id: string) {
        return this.inventoryService.deleteIngredient(id);
    }

    // --- Retail Stock ---
    @Get('retail')
    async getRetailStock() {
        return this.inventoryService.getRetailStock();
    }

    @Post('retail')
    async createRetailStock(@Body() data: any) {
        return this.inventoryService.createRetailStock(data);
    }

    @Patch('retail/:id')
    async updateRetailStock(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateRetailStock(id, data);
    }

    @Delete('retail/:id')
    async deleteRetailStock(@Param('id') id: string) {
        return this.inventoryService.deleteRetailStock(id);
    }

    // --- Recipe BOM ---
    @Get('bom')
    async getRecipeBOMs() {
        return this.inventoryService.getRecipeBOMs();
    }

    @Post('bom')
    async createRecipeBOM(@Body() data: any) {
        return this.inventoryService.createRecipeBOM(data);
    }

    @Delete('bom/:id')
    async deleteRecipeBOM(@Param('id') id: string) {
        return this.inventoryService.deleteRecipeBOM(id);
    }

    // --- Categories (Backup Routes) ---
    @Get('/categories')
    async findAllCategories() {
        return (this.inventoryService as any).getCategories();
    }

    @Post('/categories')
    async createCategory(@Body() data: { name: string }) {
        return (this.inventoryService as any).createCategory(data);
    }

    @Patch('/categories/:id')
    async updateCategory(@Param('id') id: string, @Body() data: { name: string }) {
        return (this.inventoryService as any).updateCategory(id, data);
    }

    @Delete('/categories/:id')
    async removeCategory(@Param('id') id: string) {
        return (this.inventoryService as any).deleteCategory(id);
    }

    // --- Global Addons ---
    @Get('global-addons')
    async getGlobalAddons() {
        return this.inventoryService.getGlobalAddons();
    }

    @Post('global-addons')
    async createGlobalAddon(@Body() data: any) {
        return this.inventoryService.createGlobalAddon(data);
    }

    @Patch('global-addons/:id')
    async updateGlobalAddon(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updateGlobalAddon(id, data);
    }

    @Delete('global-addons/:id')
    async deleteGlobalAddon(@Param('id') id: string) {
        return this.inventoryService.deleteGlobalAddon(id);
    }

    // --- Packages ---
    @Get('packages')
    async getPackages() {
        return this.inventoryService.getPackages();
    }

    @Post('packages')
    async createPackage(@Body() data: any) {
        return this.inventoryService.createPackage(data);
    }

    @Patch('packages/:id')
    async updatePackage(@Param('id') id: string, @Body() data: any) {
        return this.inventoryService.updatePackage(id, data);
    }

    @Delete('packages/:id')
    async deletePackage(@Param('id') id: string) {
        return this.inventoryService.deletePackage(id);
    }
}
