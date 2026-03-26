import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE DIAGNOSTICS ---');
    try {
        const tables: any = await prisma.$queryRawUnsafe(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`);
        console.log('Found tables:', tables.map((t: any) => t.tablename).join(', '));
        
        const cols: any = await prisma.$queryRawUnsafe(`SELECT column_name, table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'costPrice'`);
        console.log('Found costPrice in tables:', cols.map((c: any) => c.table_name).join(', '));
    } catch (e) {
        console.error('Diagnostic failed:', e);
    }

    console.log('\n--- FORCE INITIALIZATION ---');

    // Attempt to add costPrice
    for (const table of ['Ingredient', 'ProductSize', 'RetailStock']) {
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "costPrice" DECIMAL(65,30) DEFAULT 0`);
            console.log(`Successfully added costPrice to ${table}`);
        } catch (e: any) {
            if (e.message.includes('already exists')) {
                console.log(`Column costPrice already exists in ${table}`);
            } else {
                console.error(`Error adding costPrice to ${table}:`, e.message);
            }
        }
    }

    // Attempt to create Expense table
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE "Expense" (
                "id" TEXT NOT NULL,
                "title" TEXT NOT NULL,
                "description" TEXT,
                "amount" DECIMAL(65,30) NOT NULL,
                "category" TEXT NOT NULL,
                "date" TIMESTAMP(3) NOT NULL,
                "userId" TEXT NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
            )
        `);
        console.log('Successfully created Expense table.');
    } catch (e: any) {
        if (e.message.includes('already exists')) {
            console.log('Expense table already exists.');
        } else {
            console.error('Error creating Expense table:', e.message);
        }
    }

    // Seed data
    try {
        await prisma.$executeRawUnsafe(`UPDATE "Ingredient" SET "costPrice" = (random() * 400 + 100)::numeric WHERE "costPrice" = 0`);
        const admin: any = await prisma.$queryRawUnsafe(`SELECT id FROM "User" WHERE role = 'ADMIN' LIMIT 1`);
        if (admin && admin.length > 0) {
            const adminId = admin[0].id;
            const id = 'exp_final_' + Date.now();
            await prisma.$executeRawUnsafe(`
                INSERT INTO "Expense" (id, title, amount, category, date, "userId", "updatedAt")
                VALUES ('${id}', 'Initialization Fee', 5000, 'System', CURRENT_TIMESTAMP, '${adminId}', CURRENT_TIMESTAMP)
            `);
            console.log('Seeded one test expense.');
        }
    } catch (e: any) {
        console.error('Seeding failed:', e.message);
    }
}

main().finally(() => prisma.$disconnect());
