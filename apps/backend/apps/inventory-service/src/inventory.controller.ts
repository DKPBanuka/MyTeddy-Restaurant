import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @MessagePattern({ cmd: 'get_products' })
    async getProducts() {
        return this.inventoryService.getProducts();
    }

    @MessagePattern({ cmd: 'deduct_stock' })
    async deductStock(@Payload() items: any[]) {
        return this.inventoryService.deductStock(items);
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
}
