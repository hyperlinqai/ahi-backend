import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure cloudinary dynamically from environment parameters
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
    localFilePath: string,
    folder: string = "general"
): Promise<{ url: string; publicId: string } | null> => {
    try {
        if (!localFilePath) return null;

        // Upload the file on cloudinary natively allocating folder maps explicitly
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: folder
        });

        // Delete the locally saved temporary file securely 
        fs.unlinkSync(localFilePath);

        return {
            url: response.url,
            publicId: response.public_id
        };
    } catch (error) {
        // If operation fails natively, we still remove the file reliably
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return null;
    }
};

export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
    try {
        if (!publicId) return false;

        const response = await cloudinary.uploader.destroy(publicId);
        return response.result === "ok";
    } catch (error) {
        console.error("Cloudinary Deletion Error:", error);
        return false;
    }
}
