import { PrismaClient, Role, ProductType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. Users
    const admin = await prisma.user.upsert({
        where: { email: 'admin@myteddy.com' },
        update: { role: Role.ADMIN },
        create: {
            name: 'Super Admin',
            email: 'admin@myteddy.com',
            pin: '1234',
            password: await bcrypt.hash('admin123', 10), // Added password for admin
            role: Role.ADMIN,
        },
    });

    // 1.5 Role Permissions - Delete then Create for reliability in seed
    await prisma.rolePermission.deleteMany({});
    await prisma.rolePermission.createMany({
        data: [
            {
                role: Role.ADMIN,
                permissions: ['POS', 'REPORTS', 'EVENTS', 'INVENTORY', 'STAFF', 'SETTINGS', 'CUSTOMERS', 'ANALYSIS', 'MENU_MANAGEMENT', 'DASHBOARD'],
            },
            {
                role: Role.CASHIER,
                permissions: ['POS', 'REPORTS', 'EVENTS'],
            }
        ]
    });

    // 2. Ingredients
    const rice = await prisma.ingredient.findFirst({ where: { name: 'Rice' } }) || 
                 await prisma.ingredient.create({ data: { name: 'Rice', stockQty: 50000, unitOfMeasure: 'GRAMS', minLevel: 5000 } });

    const chicken = await prisma.ingredient.findFirst({ where: { name: 'Chicken Breast' } }) || 
                    await prisma.ingredient.create({ data: { name: 'Chicken Breast', stockQty: 20000, unitOfMeasure: 'GRAMS', minLevel: 5000 } });

    console.log({ rice, chicken });

    // 3. Products
    const friedRice = await prisma.product.findFirst({ where: { name: 'Chicken Fried Rice' } }) ||
                      await prisma.product.create({
                          data: {
                              name: 'Chicken Fried Rice',
                              price: 850.0,
                              type: ProductType.FOOD,
                              recipeBOMs: { create: [{ ingredientId: rice.id, quantity: 200 }, { ingredientId: chicken.id, quantity: 150 }] }
                          }
                      });

    const bearLarge = await prisma.product.findUnique({ where: { barcode: 'TB-L-001' } }) ||
                      await prisma.product.create({
                          data: {
                              name: 'Teddy Bear Large',
                              price: 4500.0,
                              type: ProductType.RETAIL,
                              barcode: 'TB-L-001',
                              retailStock: { create: { stockQty: 50, supplierDetails: 'Teddy Co. Ltd.' } }
                          }
                      });
    
    const bearSmall = await prisma.product.findUnique({ where: { barcode: 'TB-S-002' } }) ||
                      await prisma.product.create({
                          data: {
                              name: 'Teddy Bear Small',
                              price: 1500.0,
                              type: ProductType.RETAIL,
                              barcode: 'TB-S-002',
                              retailStock: { create: { stockQty: 100, supplierDetails: 'Teddy Co. Ltd.' } }
                          }
                      });

    console.log({ bearLarge, bearSmall });
    // Create Cashier
    const hashedCashierPassword = await bcrypt.hash('cashier123', 10);
    const cashier = await prisma.user.upsert({
        where: { email: 'cashier@myteddy.com' },
        update: {},
        create: {
            email: 'cashier@myteddy.com',
            name: 'Cashier User',
            password: hashedCashierPassword,
            pin: '1234',
            role: 'CASHIER',
        },
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
