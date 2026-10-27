import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../supabase.js';

export const uploadRouter = Router();

const BUCKET_NAME = 'Azwari_Product_Images';

// Helper to determine file extension and mime type from Base64 or filename
function parseBase64Data(rawInput: string, fallbackFileName?: string): { buffer: Buffer; mimeType: string; extension: string } {
  let mimeType = 'image/jpeg';
  let extension = 'jpg';
  let base64String = rawInput;

  // Check if string is a Data URL: data:image/png;base64,...
  const matches = rawInput.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    mimeType = matches[1];
    base64String = matches[2];
  } else if (fallbackFileName) {
    const ext = fallbackFileName.split('.').pop()?.toLowerCase();
    if (ext === 'png') {
      mimeType = 'image/png';
      extension = 'png';
    } else if (ext === 'webp') {
      mimeType = 'image/webp';
      extension = 'webp';
    } else if (ext === 'gif') {
      mimeType = 'image/gif';
      extension = 'gif';
    } else if (ext === 'svg') {
      mimeType = 'image/svg+xml';
      extension = 'svg';
    }
  }

  if (mimeType === 'image/png') extension = 'png';
  else if (mimeType === 'image/webp') extension = 'webp';
  else if (mimeType === 'image/gif') extension = 'gif';
  else if (mimeType === 'image/svg+xml') extension = 'svg';
  else extension = 'jpg';

  const buffer = Buffer.from(base64String, 'base64');
  return { buffer, mimeType, extension };
}

/**
 * POST /api/upload/product-image
 * Receives file data (Base64) from frontend, securely uploads it to Supabase
 * Storage bucket 'Azwari_Product_Images' on behalf of the client, and returns
 * the public CDN URL.
 */
uploadRouter.post('/product-image', async (req: Request, res: Response) => {
  try {
    const { fileData, fileName, productId, category } = req.body;

    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: fileData (must be a base64 encoded string or Data URL)',
      });
    }

    // Parse base64 and deduce mime/extension
    const { buffer, mimeType, extension } = parseBase64Data(fileData, fileName);

    // Limit file size to 15MB on backend
    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File size exceeds maximum allowable limit of 15MB',
      });
    }

    // Generate safe, clean storage path
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(4).toString('hex');
    const safePrefix = productId ? productId.replace(/[^a-zA-Z0-9_-]/g, '') : 'prod';
    const storagePath = `${safePrefix}_${timestamp}_${randomHex}.${extension}`;

    // Upload to Supabase Storage via backend elevated admin client
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[STORAGE UPLOAD ERROR] Supabase Storage upload failed:', uploadError);
      return res.status(500).json({
        success: false,
        error: `Supabase Storage upload failed: ${uploadError.message}`,
        details: uploadError,
      });
    }

    // Get the public URL for the newly uploaded asset
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    console.log(`[STORAGE] Uploaded product image to ${BUCKET_NAME}/${storagePath} (${buffer.length} bytes)`);

    return res.status(200).json({
      success: true,
      message: 'Product image successfully uploaded to Supabase Storage',
      imageUrl: publicUrl,
      bucket: BUCKET_NAME,
      path: storagePath,
      sizeBytes: buffer.length,
      mimeType,
    });
  } catch (err: any) {
    console.error('[SERVER UPLOAD ERROR]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An unexpected error occurred during image upload',
    });
  }
});

/**
 * GET /api/upload/bucket-info
 * Returns the status and health of the 'Azwari_Product_Images' Supabase storage bucket
 */
uploadRouter.get('/bucket-info', async (_req: Request, res: Response) => {
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    const targetBucket = buckets?.find((b) => b.name === BUCKET_NAME);
    return res.status(200).json({
      success: true,
      bucketName: BUCKET_NAME,
      isConfigured: !!targetBucket,
      bucketDetails: targetBucket || null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
