import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateBody, CreateProductSchema, UpdateProductSchema } from '../middleware/zodValidators.js';
import { WalletService, InsufficientCollateralError } from '../services/walletService.js';

export const productRouter = Router();

export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'Fashion & Leather': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
  'Coffee & Agro': 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=800&q=80',
  'Beauty & Health': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  'Electronics & Home': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'Artisan Crafts': 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=800&q=80',
};

export function resolveProductImages(p: any): { imageUrl: string; images: string[] } {
  let imageUrl = p.imageUrl || '';
  let images: string[] = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];

  // Check description tag if not present
  if (!imageUrl || images.length === 0) {
    const imgMatch = p.description?.match(/<!--IMG:(\{.*?\})-->/);
    if (imgMatch) {
      try {
        const parsed = JSON.parse(imgMatch[1]);
        if (!imageUrl && parsed.imageUrl) imageUrl = parsed.imageUrl;
        if (images.length === 0 && Array.isArray(parsed.images)) images = parsed.images;
      } catch (e) { }
    }
  }

  // Fallback to category default
  if (!imageUrl) {
    const cat = p.category || '';
    const nameLower = (p.name || '').toLowerCase();
    if (nameLower.includes('lotion')) {
      imageUrl = 'https://images.unsplash.com/photo-1608248597359-009772c3d550?auto=format&fit=crop&w=800&q=80';
    } else if (DEFAULT_CATEGORY_IMAGES[cat]) {
      imageUrl = DEFAULT_CATEGORY_IMAGES[cat];
    } else {
      imageUrl = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
    }
  }

  if (images.length === 0 && imageUrl) {
    images = [imageUrl];
  }

  return { imageUrl, images };
}

export function formatProductForFrontend(p: any) {
  const unitPrice = Number(p.unitPrice);

  let commType: 'fixed_per_unit' | 'percentage' = 'percentage';
  let commRate = 12;

  const commMatch = p.description?.match(/<!--COMM:(\{.*?\})-->/);
  if (commMatch) {
    try {
      const parsed = JSON.parse(commMatch[1]);
      if (parsed.type) commType = parsed.type;
      if (parsed.rate !== undefined) commRate = Number(parsed.rate);
    } catch (e) { }
  } else if (p.costPrice !== undefined && Number(p.costPrice) > 0 && Number(p.costPrice) <= 100) {
    commRate = Number(p.costPrice);
  }

  const cleanDescription = p.description
    ? p.description.replace(/<!--COMM:\{.*?\}-->/g, '').replace(/<!--IMG:\{.*?\}-->/g, '').trim()
    : '';
  const status = !p.isActive ? 'draft' : p.stock > 0 ? 'active' : 'out_of_stock';
  const imgData = resolveProductImages(p);

  return {
    id: p.id,
    supplierId: p.businessId,
    supplierName: p.business?.name || 'Supplier Merchant',
    name: p.name,
    sku: p.sku,
    category: p.category as any,
    description: cleanDescription || p.name,
    imageUrl: imgData.imageUrl,
    images: imgData.images,
    unitPrice,
    suggestedRetailPrice: p.suggestedRetailPrice ? Number(p.suggestedRetailPrice) : unitPrice * 1.25,
    costPrice: Number(p.costPrice || 0),
    stock: p.stock,
    minimumOrderQty: p.minimumOrderQty,
    variants: (p.variants || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      additionalPrice: Number(v.additionalPrice),
      stock: v.stock,
    })),
    deliveryAreas: p.deliveryAreas || ['Bole', 'Kirkos', 'Yeka', 'Arada', 'Lideta', 'Nifas Silk-Lafto'],
    standardDeliveryFee: Number(p.standardDeliveryFee || 120),
    estimatedFulfillmentHours: p.estimatedFulfillmentHours || 24,
    fulfillmentType: (p.fulfillmentType as any) || 'physical',
    status,
    isActive: p.isActive,
    commissionTerms: {
      id: 'comm_' + p.id,
      productId: p.id,
      type: commType,
      rateOrAmount: commRate,
      calculationBasis: 'subtotal_excluding_delivery' as const,
      eligibilityConditions: 'Buyer verified handover via verified Ethiopian delivery receipt',
      returnPeriodDays: 2,
      settlementDeadlineHours: 24,
      version: 1,
      isActive: p.isActive,
      effectiveFrom: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
    },
    createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
  };
}

/**
 * GET /api/products
 * Public listing of products
 */
productRouter.get('/', async (req: any, res: Response): Promise<void> => {
  try {
    const { activeOnly, supplierId } = req.query;
    const whereClause: any = {};
    if (activeOnly === 'true') whereClause.isActive = true;
    if (supplierId) whereClause.businessId = supplierId as string;

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        variants: true,
        business: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = products.map(formatProductForFrontend);
    res.status(200).json({ success: true, count: formatted.length, products: formatted });
  } catch (error: any) {
    console.error('[Get Products Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/:id
 * Single product
 */
productRouter.get('/:id', async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const p = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, business: true },
    });

    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, product: formatProductForFrontend(p) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/products
 * Supplier creates a new product
 */
productRouter.post(
  '/',
  requireAuth,
  requireRole('supplier', 'admin'),
  validateBody(CreateProductSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const body = req.body;

      let businessId = user.businessId;
      if (user.role === 'admin' && req.body.supplierId) {
        businessId = req.body.supplierId;
      }
      if (!businessId) {
        const firstBiz = await prisma.business.findFirst({
          where: {
            OR: [
              ...(user.authUserId ? [{ authUserId: user.authUserId }] : []),
              { contactEmail: user.email },
            ],
          },
        });
        businessId = firstBiz?.id;
      }

      if (!businessId) {
        res.status(403).json({ success: false, error: 'No supplier business profile found for this user account' });
        return;
      }

      const generatedSku = body.sku || 'SKU-' + Date.now().toString(36).toUpperCase();
      const resolvedImg = resolveProductImages({
        category: body.category,
        name: body.name,
        imageUrl: body.imageUrl,
        images: body.images,
      });

      const commType = body.commissionTerms?.type || 'percentage';
      const commRate = Number(body.commissionTerms?.rateOrAmount ?? 12);
      const cleanDesc = (body.description || body.name)
        .replace(/<!--COMM:\{.*?\}-->/g, '')
        .replace(/<!--IMG:\{.*?\}-->/g, '')
        .trim();

      const finalDescription = `${cleanDesc} <!--COMM:${JSON.stringify({ type: commType, rate: commRate })}--> <!--IMG:${JSON.stringify({ imageUrl: resolvedImg.imageUrl, images: resolvedImg.images })}-->`;

      // Business Rule 1 & Rule 4: Validate merchant deposit collateral
      const unitPrice = Number(body.unitPrice);
      const commissionPerUnit =
        commType === 'fixed_per_unit'
          ? commRate
          : Math.round(unitPrice * (commRate / 100));

      try {
        await WalletService.validateListingCollateral({
          businessId,
          stock: body.stock || 1,
          commissionPerUnit,
        });
      } catch (collateralErr: any) {
        if (collateralErr instanceof InsufficientCollateralError) {
          res.status(402).json({
            success: false,
            error: collateralErr.message,
            details: collateralErr.details,
          });
          return;
        }
        throw collateralErr;
      }

      const product = await prisma.$transaction(async (tx: any) => {
        const created = await tx.product.create({
          data: {
            businessId,
            name: body.name,
            sku: generatedSku,
            category: body.category,
            description: finalDescription,
            imageUrl: resolvedImg.imageUrl,
            images: resolvedImg.images,
            unitPrice: body.unitPrice,
            suggestedRetailPrice: body.suggestedRetailPrice || body.unitPrice * 1.25,
            costPrice: body.costPrice !== undefined ? body.costPrice : commRate,
            stock: body.stock || 0,
            minimumOrderQty: body.minimumOrderQty || 1,
            deliveryAreas: body.deliveryAreas || ['Bole', 'Kirkos', 'Yeka', 'Arada', 'Lideta', 'Nifas Silk-Lafto'],
            standardDeliveryFee: body.standardDeliveryFee || 120,
            estimatedFulfillmentHours: body.estimatedFulfillmentHours || 24,
            fulfillmentType: body.fulfillmentType || 'physical',
            isActive: true,
          },
        });

        if (body.variants && body.variants.length > 0) {
          for (const v of body.variants) {
            await tx.productVariant.create({
              data: {
                productId: created.id,
                name: v.name,
                sku: v.sku || `${created.sku}-${v.name.replace(/\s+/g, '-').toUpperCase()}`,
                additionalPrice: v.additionalPrice || 0,
                stock: v.stock || 0,
              },
            });
          }
        }

        return await tx.product.findUnique({
          where: { id: created.id },
          include: { variants: true, business: true },
        });
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'Supplier',
            action: 'CREATE_PRODUCT',
            entityType: 'Product',
            entityId: product!.id,
            businessId,
            description: `Product created: ${product!.name} (SKU: ${product!.sku}). Stock: ${product!.stock}. Price: ETB ${product!.unitPrice}.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      res.status(201).json({ success: true, product: formatProductForFrontend(product) });
    } catch (error: any) {
      console.error('[Create Product Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to create product' });
    }
  }
);

/**
 * PATCH /api/products/:id
 * Supplier updates their own product
 */
productRouter.patch(
  '/:id',
  requireAuth,
  requireRole('supplier', 'admin'),
  validateBody(UpdateProductSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const body = req.body;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      if (user.role === 'supplier' && existing.businessId !== user.businessId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this product' });
        return;
      }

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.sku !== undefined) updateData.sku = body.sku;
      if (body.category !== undefined) updateData.category = body.category;
      if (body.unitPrice !== undefined) updateData.unitPrice = body.unitPrice;
      if (body.suggestedRetailPrice !== undefined) updateData.suggestedRetailPrice = body.suggestedRetailPrice;
      if (body.costPrice !== undefined) updateData.costPrice = body.costPrice;
      if (body.stock !== undefined) updateData.stock = body.stock;
      if (body.minimumOrderQty !== undefined) updateData.minimumOrderQty = body.minimumOrderQty;
      if (body.deliveryAreas !== undefined) updateData.deliveryAreas = body.deliveryAreas;
      if (body.standardDeliveryFee !== undefined) updateData.standardDeliveryFee = body.standardDeliveryFee;
      if (body.estimatedFulfillmentHours !== undefined) updateData.estimatedFulfillmentHours = body.estimatedFulfillmentHours;
      if (body.fulfillmentType !== undefined) updateData.fulfillmentType = body.fulfillmentType;
      if (body.isActive !== undefined) updateData.isActive = body.isActive;

      // Handle images and description
      const effImg = body.imageUrl || existing.imageUrl;
      const effImgs = body.images || existing.images;
      const resolved = resolveProductImages({
        category: body.category || existing.category,
        name: body.name || existing.name,
        imageUrl: effImg,
        images: effImgs,
      });

      updateData.imageUrl = resolved.imageUrl;
      updateData.images = resolved.images;

      const commType = body.commissionTerms?.type || 'percentage';
      const commRate = Number(body.commissionTerms?.rateOrAmount ?? existing.costPrice ?? 12);
      const rawDesc = body.description !== undefined ? body.description : existing.description;
      const cleanDesc = (rawDesc || existing.name).replace(/<!--COMM:\{.*?\}-->/g, '').replace(/<!--IMG:\{.*?\}-->/g, '').trim();
      updateData.description = `${cleanDesc} <!--COMM:${JSON.stringify({ type: commType, rate: commRate })}--> <!--IMG:${JSON.stringify({ imageUrl: resolved.imageUrl, images: resolved.images })}-->`;

      const updated = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { variants: true, business: true },
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorRole: user.role,
            actorName: user.fullName || 'Supplier',
            action: 'UPDATE_PRODUCT',
            entityType: 'Product',
            entityId: id,
            businessId: existing.businessId,
            description: `Product #${updated.name} updated. Active: ${updated.isActive}, Stock: ${updated.stock}.`,
          },
        });
      } catch (auditErr) {
        console.warn('[Audit Log Notice]', auditErr);
      }

      res.status(200).json({ success: true, product: formatProductForFrontend(updated) });
    } catch (error: any) {
      console.error('[Update Product Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to update product' });
    }
  }
);

/**
 * DELETE /api/products/:id
 * Supplier archives or permanently deletes product
 */
productRouter.delete('/:id', requireAuth, requireRole('supplier', 'admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const user = req.user!;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    if (user.role === 'supplier' && existing.businessId !== user.businessId) {
      res.status(403).json({ success: false, error: 'Forbidden: You do not own this product' });
      return;
    }

    if (permanent === 'true') {
      const orderItemsCount = await prisma.orderItem.count({ where: { productId: id } });
      if (orderItemsCount > 0) {
        await prisma.product.update({
          where: { id },
          data: { isActive: false },
        });
        res.status(200).json({ success: true, message: 'Product has order history; archived safely.' });
        return;
      }
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      await prisma.product.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Product permanently deleted' });
      return;
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    res.status(200).json({ success: true, message: 'Product archived' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/products/:id/enroll
 * Salesperson enrolls in promoting a product
 */
productRouter.post(
  '/:id/enroll',
  requireAuth,
  requireRole('salesperson', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;

      let salesPartnerId = user.salesPartnerId;
      if (!salesPartnerId) {
        const sp = await prisma.salesPartner.findFirst({
          where: {
            OR: [
              ...(user.authUserId ? [{ authUserId: user.authUserId }] : []),
              { email: user.email },
            ],
          },
        });
        salesPartnerId = sp?.id;
      }

      if (!salesPartnerId) {
        res.status(403).json({ success: false, error: 'No sales partner profile found for this user account' });
        return;
      }

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product || !product.isActive) {
        res.status(404).json({ success: false, error: 'Product not found or inactive' });
        return;
      }

      const sp = await prisma.salesPartner.findUnique({ where: { id: salesPartnerId } });
      if (!sp) {
        res.status(404).json({ success: false, error: 'Sales agent profile not found' });
        return;
      }

      const enrolled = Array.isArray(sp.enrolledProductIds) ? [...sp.enrolledProductIds] : [];
      if (!enrolled.includes(id)) {
        enrolled.push(id);
        await prisma.salesPartner.update({
          where: { id: salesPartnerId },
          data: { enrolledProductIds: enrolled },
        });
      }

      res.status(200).json({
        success: true,
        message: `Successfully enrolled in promoting ${product.name}`,
        enrolledProductIds: enrolled,
      });
    } catch (error: any) {
      console.error('[Enroll Product Error]', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to enroll in product' });
    }
  }
);
