import "dotenv/config";
import db from "../src/db";
import { categories, productImages, products } from "../src/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

type CategoryRule = {
    name: string;
    slug: string;
    description: string;
    sortOrder: number;
    keywords: string[];
};

const PARENT_COLLECTION = {
    name: "Padma Collection",
    slug: "padma-the-lotus",
    description: "A signature edit inspired by lotus motifs, statement ear jewellery, and handcrafted festive forms.",
    sortOrder: 0,
};

const CATEGORY_RULES: CategoryRule[] = [
    {
        name: "Earrings",
        slug: "earrings",
        description: "Drops, crawlers, earcuffs, bugadi, and statement ear jewellery from the Padma collection.",
        sortOrder: 1,
        keywords: ["earring", "earrings", "drops", "crawler", "earcuff", "earcuffs", "bugadi"],
    },
    {
        name: "Neckpieces",
        slug: "neckpiece",
        description: "Lotus chokers and neck-led statement pieces designed to anchor the collection.",
        sortOrder: 2,
        keywords: ["choker", "neckpiece", "neckpieces", "necklace", "sutra"],
    },
    {
        name: "Jewelled Glares",
        slug: "jewelled-glares",
        description: "Distinctive jewelled eyewear silhouettes that add drama to occasion styling.",
        sortOrder: 3,
        keywords: ["glare", "glares"],
    },
];

function findRuleForProduct(title: string): CategoryRule {
    const normalizedTitle = title.toLowerCase();
    const matchedRule = CATEGORY_RULES.find((rule) =>
        rule.keywords.some((keyword) => normalizedTitle.includes(keyword))
    );

    return matchedRule || CATEGORY_RULES[0];
}

async function ensureParentCategory() {
    const existingParent = await db.query.categories.findFirst({
        where: eq(categories.slug, PARENT_COLLECTION.slug),
    });

    if (existingParent) {
        const [updatedParent] = await db
            .update(categories)
            .set({
                name: PARENT_COLLECTION.name,
                description: PARENT_COLLECTION.description,
                sortOrder: PARENT_COLLECTION.sortOrder,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, existingParent.id))
            .returning();

        return updatedParent;
    }

    const [createdParent] = await db
        .insert(categories)
        .values({
            ...PARENT_COLLECTION,
            parentId: null,
            isActive: true,
        })
        .returning();

    return createdParent;
}

async function ensureChildCategories(parentId: string) {
    const childCategoryMap = new Map<string, typeof categories.$inferSelect>();

    for (const rule of CATEGORY_RULES) {
        const existingCategory = await db.query.categories.findFirst({
            where: and(eq(categories.slug, rule.slug), eq(categories.parentId, parentId)),
        });

        if (existingCategory) {
            const [updatedCategory] = await db
                .update(categories)
                .set({
                    name: rule.name,
                    description: rule.description,
                    sortOrder: rule.sortOrder,
                    updatedAt: new Date(),
                })
                .where(eq(categories.id, existingCategory.id))
                .returning();

            childCategoryMap.set(rule.slug, updatedCategory);
            continue;
        }

        const [createdCategory] = await db
            .insert(categories)
            .values({
                name: rule.name,
                slug: rule.slug,
                description: rule.description,
                parentId,
                isActive: true,
                sortOrder: rule.sortOrder,
            })
            .returning();

        childCategoryMap.set(rule.slug, createdCategory);
    }

    return childCategoryMap;
}

async function assignProducts(parentId: string, childCategoryMap: Map<string, typeof categories.$inferSelect>) {
    const collectionProducts = await db.query.products.findMany({
        where: eq(products.categoryId, parentId),
        with: {
            images: {
                orderBy: [asc(productImages.sortOrder)],
            },
        },
        orderBy: [asc(products.createdAt)],
    });

    const groupedImages = new Map<string, string>();

    for (const product of collectionProducts) {
        const rule = findRuleForProduct(product.title);
        const targetCategory = childCategoryMap.get(rule.slug);

        if (!targetCategory) {
            continue;
        }

        await db
            .update(products)
            .set({
                categoryId: targetCategory.id,
                updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));

        if (!groupedImages.has(rule.slug) && product.images[0]?.url) {
            groupedImages.set(rule.slug, product.images[0].url);
        }
    }

    for (const rule of CATEGORY_RULES) {
        const targetCategory = childCategoryMap.get(rule.slug);
        if (!targetCategory) continue;

        const categoryImage = groupedImages.get(rule.slug);
        if (!categoryImage) continue;

        await db
            .update(categories)
            .set({
                imageUrl: categoryImage,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, targetCategory.id));
    }

    const fallbackParentImage =
        collectionProducts.find((product) => product.images[0]?.url)?.images[0]?.url ?? null;

    if (fallbackParentImage) {
        await db
            .update(categories)
            .set({
                imageUrl: fallbackParentImage,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, parentId));
    }
}

async function sortTopLevelCollections(parentId: string) {
    const topLevelCategories = await db.query.categories.findMany({
        where: isNull(categories.parentId),
        orderBy: [asc(categories.sortOrder), asc(categories.createdAt)],
    });

    for (const [index, category] of topLevelCategories.entries()) {
        const sortOrder = category.id === parentId ? 0 : index + 1;
        await db
            .update(categories)
            .set({ sortOrder, updatedAt: new Date() })
            .where(eq(categories.id, category.id));
    }
}

async function main() {
    const parentCategory = await ensureParentCategory();
    const childCategoryMap = await ensureChildCategories(parentCategory.id);

    await assignProducts(parentCategory.id, childCategoryMap);
    await sortTopLevelCollections(parentCategory.id);

    console.log("Padma catalog structure synced successfully.");
}

main()
    .catch((error) => {
        console.error("Failed to organize Padma catalog:", error);
        process.exit(1);
    })
    .finally(async () => {
        process.exit(0);
    });
