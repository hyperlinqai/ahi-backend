import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

function resolveCloudinaryConfig() {
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if (cloudinaryUrl) {
        try {
            const parsedUrl = new URL(cloudinaryUrl);
            const cloudName = parsedUrl.hostname;
            const apiKey = decodeURIComponent(parsedUrl.username);
            const apiSecret = decodeURIComponent(parsedUrl.password);

            if (cloudName && apiKey && apiSecret) {
                return {
                    cloud_name: cloudName,
                    api_key: apiKey,
                    api_secret: apiSecret,
                };
            }
        } catch (error) {
            console.error("Invalid CLOUDINARY_URL configuration:", error);
        }
    }

    return {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    };
}

const cloudinaryConfig = resolveCloudinaryConfig();

cloudinary.config(cloudinaryConfig);

function isCloudinaryConfigured() {
    return Boolean(
        cloudinaryConfig.cloud_name &&
        cloudinaryConfig.api_key &&
        cloudinaryConfig.api_secret
    );
}

interface ImageVariant {
    suffix: string;
    width: number;
    quality: number;
}

const PRODUCT_VARIANTS: ImageVariant[] = [
    { suffix: "thumb", width: 300, quality: 60 },
    { suffix: "medium", width: 800, quality: 70 },
    { suffix: "large", width: 1200, quality: 80 },
];

const BANNER_VARIANTS: ImageVariant[] = [
    { suffix: "medium", width: 800, quality: 70 },
    { suffix: "large", width: 1920, quality: 80 },
];

const CATEGORY_VARIANTS: ImageVariant[] = [
    { suffix: "thumb", width: 300, quality: 60 },
    { suffix: "medium", width: 600, quality: 70 },
];

function getVariants(folder: string): ImageVariant[] {
    if (folder === "products") return PRODUCT_VARIANTS;
    if (folder === "banners") return BANNER_VARIANTS;
    if (folder === "categories") return CATEGORY_VARIANTS;
    return [{ suffix: "default", width: 800, quality: 75 }];
}

async function processAndUpload(
    buffer: Buffer,
    folder: string,
    variant: ImageVariant
): Promise<{ url: string; publicId: string }> {
    const webpBuffer = await sharp(buffer)
        .resize(variant.width, undefined, { withoutEnlargement: true })
        .webp({ quality: variant.quality })
        .toBuffer();

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                format: "webp",
                resource_type: "image",
            },
            (error, result) => {
                if (error || !result) return reject(error || new Error("Upload failed"));
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        stream.end(webpBuffer);
    });
}

/**
 * Upload a single image (used by banners, categories).
 * Converts to WebP, compresses, and uploads the largest variant.
 */
export const uploadToCloudinary = async (
    fileBuffer: Buffer,
    folder: string = "general"
): Promise<{ url: string; publicId: string } | null> => {
    try {
        if (!isCloudinaryConfigured()) {
            throw new Error("Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.");
        }

        const variants = getVariants(folder);
        const largest = variants[variants.length - 1];
        return await processAndUpload(fileBuffer, folder, largest);
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return null;
    }
};

/**
 * Upload product image in multiple sizes (thumb, medium, large).
 * Returns the large URL as primary, with all variant URLs.
 */
export const uploadProductImage = async (
    fileBuffer: Buffer
): Promise<{ url: string; publicId: string; variants: Record<string, string> } | null> => {
    try {
        if (!isCloudinaryConfigured()) {
            throw new Error("Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.");
        }

        const results = await Promise.all(
            PRODUCT_VARIANTS.map(async (variant) => {
                const result = await processAndUpload(fileBuffer, "products", variant);
                return { suffix: variant.suffix, ...result };
            })
        );

        const large = results.find((r) => r.suffix === "large") || results[results.length - 1];
        const variantUrls: Record<string, string> = {};
        for (const r of results) {
            variantUrls[r.suffix] = r.url;
        }

        return {
            url: large.url,
            publicId: large.publicId,
            variants: variantUrls,
        };
    } catch (error) {
        console.error("Product image upload error:", error);
        return null;
    }
};

export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
    try {
        if (!publicId) return false;
        const response = await cloudinary.uploader.destroy(publicId);
        return response.result === "ok";
    } catch (error) {
        console.error("Cloudinary deletion error:", error);
        return false;
    }
};
