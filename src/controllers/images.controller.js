const imagesRepo = require('../repositories/images.repository');
const { parseBase64Image } = require('../utils/image.util');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

// ─── Product Images ────────────────────────────────────────────────

/**
 * POST /api/products/:id/images
 * Upload a base64 image for a product.
 * Body: { image, file_name?, asset_type?, is_primary?, sort_order? }
 * image: "data:image/jpeg;base64,..." or raw base64 string
 */
const uploadProductImage = asyncHandler(async (req, res) => {
    const { image, file_name, asset_type, is_primary, sort_order } = req.body;

    if (!image) {
        const err = new Error('image (base64 string) is required');
        err.statusCode = 400;
        throw err;
    }

    const parsed = parseBase64Image(image);

    const saved = await imagesRepo.addProductImage(req.params.id, {
        ...parsed,
        file_name,
        asset_type: asset_type || 'image',
        is_primary: is_primary || false,
        sort_order: sort_order || 0,
    });

    sendCreated(res, saved, 'Image uploaded');
});

/**
 * GET /api/products/:id/images
 * Get all images for a product.
 */
const getProductImages = asyncHandler(async (req, res) => {
    const images = await imagesRepo.getProductImages(req.params.id);
    sendSuccess(res, images, `${images.length} images found`);
});

/**
 * PATCH /api/products/:productId/images/:assetId/primary
 * Set an image as the primary image.
 */
const setPrimaryImage = asyncHandler(async (req, res) => {
    const updated = await imagesRepo.setPrimaryImage(req.params.productId, req.params.assetId);
    if (!updated) return sendNotFound(res, 'Image');
    sendSuccess(res, updated, 'Primary image set');
});

/**
 * DELETE /api/products/:productId/images/:assetId
 * Delete a product image.
 */
const deleteProductImage = asyncHandler(async (req, res) => {
    const deleted = await imagesRepo.deleteProductImage(req.params.assetId, req.params.productId);
    if (!deleted) return sendNotFound(res, 'Image');
    sendSuccess(res, {}, 'Image deleted');
});

// ─── Customer Profile Image ───────────────────────────────────────

/**
 * PUT /api/customers/:id/profile-image
 * Upload or replace the customer profile image.
 * Body: { image } (base64 string)
 */
const uploadProfileImage = asyncHandler(async (req, res) => {
    const { image } = req.body;

    if (!image) {
        const err = new Error('image (base64 string) is required');
        err.statusCode = 400;
        throw err;
    }

    const parsed = parseBase64Image(image);
    const updated = await imagesRepo.updateProfileImage(
        req.params.id,
        parsed.base64_data,
        parsed.mime_type
    );

    if (!updated) return sendNotFound(res, 'Customer');

    sendSuccess(res, {
        customer_id: updated.customer_id,
        full_name: updated.full_name,
        message: 'Profile image updated',
    }, 'Profile image updated');
});

/**
 * GET /api/customers/:id/profile-image
 * Get the customer's profile image.
 */
const getProfileImage = asyncHandler(async (req, res) => {
    const result = await imagesRepo.getProfileImage(req.params.id);

    if (!result || !result.profile_image) {
        return sendNotFound(res, 'Profile image');
    }

    sendSuccess(res, {
        profile_image: result.profile_image,
        mime_type: result.profile_image_mime,
    });
});

/**
 * DELETE /api/customers/:id/profile-image
 * Remove the customer's profile image.
 */
const removeProfileImage = asyncHandler(async (req, res) => {
    const result = await imagesRepo.removeProfileImage(req.params.id);
    if (!result) return sendNotFound(res, 'Customer');
    sendSuccess(res, {}, 'Profile image removed');
});

module.exports = {
    uploadProductImage,
    getProductImages,
    setPrimaryImage,
    deleteProductImage,
    uploadProfileImage,
    getProfileImage,
    removeProfileImage,
};
