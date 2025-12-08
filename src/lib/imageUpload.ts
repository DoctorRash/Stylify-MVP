import { supabase } from '@/integrations/supabase/client';

/**
 * Compress image before upload
 */
export async function compressImage(
    file: File,
    options: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
    } = {}
): Promise<Blob> {
    const {
        maxWidth = 1024,
        maxHeight = 1536,
        quality = 0.85,
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Could not compress image'));
                        }
                    },
                    'image/webp',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Could not load image'));
        };
        reader.onerror = () => reject(new Error('Could not read file'));
    });
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file format. Please upload JPEG, PNG, or WebP images.',
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size exceeds 10MB. Please choose a smaller image.',
        };
    }

    return { valid: true };
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadToStorage(
    file: Blob,
    options: {
        bucket: string;
        path: string;
        contentType?: string;
    }
): Promise<{ url: string; error?: string }> {
    const { bucket, path, contentType = 'image/webp' } = options;

    try {
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                contentType,
                upsert: true,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { url: '', error: uploadError.message };
        }

        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return { url: urlData.publicUrl };
    } catch (error) {
        console.error('Storage error:', error);
        return { url: '', error: 'Failed to upload image' };
    }
}

/**
 * Upload customer photo
 */
export async function uploadCustomerPhoto(
    file: File,
    userId: string
): Promise<{ url: string; error?: string }> {
    // Validate
    const validation = validateImage(file);
    if (!validation.valid) {
        return { url: '', error: validation.error };
    }

    try {
        // Compress
        const compressed = await compressImage(file);

        // Upload
        const fileName = `${userId}/customer-photo-${Date.now()}.webp`;
        return await uploadToStorage(compressed, {
            bucket: 'customer-photos',
            path: fileName,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return { url: '', error: 'Failed to process and upload image' };
    }
}

/**
 * Upload style/inspiration photo
 */
export async function uploadStylePhoto(
    file: File,
    userId: string
): Promise<{ url: string; error?: string }> {
    // Validate
    const validation = validateImage(file);
    if (!validation.valid) {
        return { url: '', error: validation.error };
    }

    try {
        // Compress
        const compressed = await compressImage(file);

        // Upload
        const fileName = `${userId}/style-photo-${Date.now()}.webp`;
        return await uploadToStorage(compressed, {
            bucket: 'order-references',
            path: fileName,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return { url: '', error: 'Failed to process and upload image' };
    }
}

/**
 * Delete image from storage
 */
export async function deleteFromStorage(
    bucket: string,
    path: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: 'Failed to delete image' };
    }
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Check if image meets minimum quality requirements
 */
export async function checkImageQuality(file: File): Promise<{
    acceptable: boolean;
    message?: string;
    dimensions?: { width: number; height: number };
}> {
    try {
        const dimensions = await getImageDimensions(file);
        const minWidth = 600;
        const minHeight = 800;

        if (dimensions.width < minWidth || dimensions.height < minHeight) {
            return {
                acceptable: false,
                message: `Image resolution too low. Minimum ${minWidth}x${minHeight}px required.`,
                dimensions,
            };
        }

        return {
            acceptable: true,
            dimensions,
        };
    } catch (error) {
        return {
            acceptable: false,
            message: 'Could not check image quality',
        };
    }
}
