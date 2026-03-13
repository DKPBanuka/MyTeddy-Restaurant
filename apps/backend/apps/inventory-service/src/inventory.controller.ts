import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @MessagePattern({ cmd: 'get_products' })
    async getProducts(@Payload() payload: { categoryId?: string }) {
        return this.inventoryService.getProducts(payload?.categoryId);
    }

    @MessagePattern({ cmd: 'deduct_stock' })
    async deductStock(@Payload() items: any[]) {
        return this.inventoryService.deductStock(items);
    }

    @MessagePattern({ cmd: 'create_product' })
    async createProduct(@Payload() data: any) {
        return this.inventoryService.createProduct(data);
    }

    @MessagePattern({ cmd: 'update_product' })
    async updateProduct(@Payload() payload: { id: string, data: any }) {
        return this.inventoryService.updateProduct(payload.id, payload.data);
    }

    @MessagePattern({ cmd: 'delete_product' })
    async deleteProduct(@Payload() id: string) {
        return this.inventoryService.deleteProduct(id);
    }

    // --- Ingredients ---
    @MessagePattern({ cmd: 'get_ingredients' })
    async getIngredients() {
        return this.inventoryService.getIngredients();
    }

    @MessagePattern({ cmd: 'create_ingredient' })
    async createIngredient(@Payload() data: any) {
        return this.inventoryService.createIngredient(data);
    }

    @MessagePattern({ cmd: 'update_ingredient' })
    async updateIngredient(@Payload() payload: { id: string, data: any }) {
        return this.inventoryService.updateIngredient(payload.id, payload.data);
    }

    @MessagePattern({ cmd: 'delete_ingredient' })
    async deleteIngredient(@Payload() id: string) {
        return this.inventoryService.deleteIngredient(id);
    }

    // --- Retail Stock ---
    @MessagePattern({ cmd: 'get_retail_stock' })
    async getRetailStock() {
        return this.inventoryService.getRetailStock();
    }

    @MessagePattern({ cmd: 'create_retail_stock' })
    async createRetailStock(@Payload() data: any) {
        return this.inventoryService.createRetailStock(data);
    }

    @MessagePattern({ cmd: 'update_retail_stock' })
    async updateRetailStock(@Payload() payload: { id: string, data: any }) {
        return this.inventoryService.updateRetailStock(payload.id, payload.data);
    }

    @MessagePattern({ cmd: 'delete_retail_stock' })
    async deleteRetailStock(@Payload() id: string) {
        return this.inventoryService.deleteRetailStock(id);
    }

    // --- Recipe BOM ---
    @MessagePattern({ cmd: 'get_recipe_boms' })
    async getRecipeBOMs() {
        return this.inventoryService.getRecipeBOMs();
    }

    @MessagePattern({ cmd: 'create_recipe_bom' })
    async createRecipeBOM(@Payload() data: any) {
        return this.inventoryService.createRecipeBOM(data);
    }

    @MessagePattern({ cmd: 'delete_recipe_bom' })
    async deleteRecipeBOM(@Payload() id: string) {
        return this.inventoryService.deleteRecipeBOM(id);
    }

    // --- Categories ---
    @MessagePattern({ cmd: 'get_categories' })
    async getCategories() {
        return this.inventoryService.getCategories();
    }

    @MessagePattern({ cmd: 'create_category' })
    async createCategory(@Payload() data: { name: string }) {
        return this.inventoryService.createCategory(data);
    }

    @MessagePattern({ cmd: 'update_category' })
    async updateCategory(@Payload() payload: { id: string, name: string }) {
        return this.inventoryService.updateCategory(payload.id, { name: payload.name });
    }

    @MessagePattern({ cmd: 'delete_category' })
    async deleteCategory(@Payload() id: string) {
        return this.inventoryService.deleteCategory(id);
    }

    // --- Global Addons ---
    @MessagePattern({ cmd: 'get_global_addons' })
    async getGlobalAddons() {
        return this.inventoryService.getGlobalAddons();
    }

    @MessagePattern({ cmd: 'create_global_addon' })
    async createGlobalAddon(@Payload() data: any) {
        return this.inventoryService.createGlobalAddon(data);
    }

    @MessagePattern({ cmd: 'update_global_addon' })
    async updateGlobalAddon(@Payload() payload: { id: string, data: any }) {
        return this.inventoryService.updateGlobalAddon(payload.id, payload.data);
    }

    @MessagePattern({ cmd: 'delete_global_addon' })
    async deleteGlobalAddon(@Payload() id: string) {
        return this.inventoryService.deleteGlobalAddon(id);
    }

    // --- Packages ---
    @MessagePattern({ cmd: 'get_packages' })
    async getPackages() {
        return this.inventoryService.getPackages();
    }

    @MessagePattern({ cmd: 'create_package' })
    async createPackage(@Payload() data: any) {
        return this.inventoryService.createPackage(data);
    }

    @MessagePattern({ cmd: 'update_package' })
    async updatePackage(@Payload() payload: { id: string, data: any }) {
        return this.inventoryService.updatePackage(payload.id, payload.data);
    }

    @MessagePattern({ cmd: 'delete_package' })
    async deletePackage(@Payload() id: string) {
        return this.inventoryService.deletePackage(id);
    }
}
