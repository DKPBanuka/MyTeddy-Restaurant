import { PrismaClient, Role, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. Users
    const admin = await prisma.user.upsert({
        where: { email: 'admin@myteddy.com' },
        update: {},
        create: {
            name: 'Super Admin',
            email: 'admin@myteddy.com',
            pin: '1234',
            role: Role.ADMIN,
        },
    });

    const cashier = await prisma.user.upsert({
        where: { email: 'cashier@myteddy.com' },
        update: {},
        create: {
            name: 'Main Cashier',
            email: 'cashier@myteddy.com',
            pin: '5678',
            role: Role.CASHIER,
        },
    });

    console.log({ admin, cashier });

    // 2. Ingredients
    const rice = await prisma.ingredient.create({
        data: {
            name: 'Rice',
            stockQty: 50000, // 50kg
            unitOfMeasure: 'GRAMS',
            minLevel: 5000,
        },
    });

    const chicken = await prisma.ingredient.create({
        data: {
            name: 'Chicken Breast',
            stockQty: 20000, // 20kg
            unitOfMeasure: 'GRAMS',
            minLevel: 5000,
        },
    });

    console.log({ rice, chicken });

    // 3. Products (Food) & Recipe BOM
    const friedRiceProduct = await prisma.product.create({
        data: {
            name: 'Chicken Fried Rice',
            description: 'Classic chicken fried rice',
            price: 850.0,
            type: ProductType.FOOD,
            recipeBOMs: {
                create: [
                    { ingredientId: rice.id, quantity: 200 }, // 200g Rice
                    { ingredientId: chicken.id, quantity: 150 }, // 150g Chicken
                ],
            },
        },
    });

    const kottuProduct = await prisma.product.create({
        data: {
            name: 'Chicken Kottu',
            description: 'Spicy chicken kottu rotti',
            price: 900.0,
            type: ProductType.FOOD,
        },
    });

    console.log({ friedRiceProduct, kottuProduct });

    // 4. Products (Retail) & Retail Stock
    const bearLarge = await prisma.product.create({
        data: {
            name: 'Teddy Bear Large',
            description: 'A very large fluffy teddy bear',
            price: 4500.0,
            type: ProductType.RETAIL,
            barcode: 'TB-L-001',
            retailStock: {
                create: {
                    stockQty: 50,
                    supplierDetails: 'Teddy Co. Ltd.',
                },
            },
        },
    });

    const bearSmall = await prisma.product.create({
        data: {
            name: 'Teddy Bear Small',
            description: 'A cute small teddy bear',
            price: 1500.0,
            type: ProductType.RETAIL,
            barcode: 'TB-S-002',
            retailStock: {
                create: {
                    stockQty: 100,
                    supplierDetails: 'Teddy Co. Ltd.',
                },
            },
        },
    });

    console.log({ bearLarge, bearSmall });
    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
