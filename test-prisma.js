const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const coupon = await prisma.coupon.create({
            data: {
                code: "DIRECTC1",
                type: "PERCENTAGE",
                discountValue: 15,
                isActive: true,
                usageCount: 0
            }
        });
        console.log("SUCCESS:", coupon);
    } catch (err) {
        console.error("PRISMA ERROR:", err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
