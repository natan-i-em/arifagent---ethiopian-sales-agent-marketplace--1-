import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { cacheService } from '../services/cacheService.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';
import crypto from 'crypto';

export const analyticsRouter = Router();

/**
 * POST /api/analytics/track
 * Lightweight client event tracker (Public)
 */
analyticsRouter.post('/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventType, page, device, userId, entityId, metadata } = req.body;

    if (!eventType) {
      res.status(400).json({ success: false, error: 'eventType is required' });
      return;
    }

    // Generate anonymized IP hash for unique visitor counting without storing raw IPs
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ipStr = Array.isArray(ip) ? ip[0] : ip;
    const ipHash = crypto.createHash('sha256').update(ipStr).digest('hex').substring(0, 16);

    // Save event in background to keep client response sub-millisecond
    prisma.analyticsEvent.create({
      data: {
        eventType,
        page: page ? String(page).substring(0, 255) : null,
        device: device ? String(device).substring(0, 50) : null,
        userId: userId ? String(userId) : null,
        entityId: entityId ? String(entityId) : null,
        metadata: metadata ? metadata : undefined,
        ipHash,
      },
    }).catch((err) => {
      console.warn('[Analytics Track Error]', err.message);
    });

    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/analytics/funnels
 * Admin-only comprehensive user performance, onboarding funnels & product velocity metrics
 */
analyticsRouter.get('/funnels', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = 'cache:analytics:funnels';
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Traffic & Acquisition Events
    const [totalEvents, recentEvents, uniqueVisitorRows] = await Promise.all([
      prisma.analyticsEvent.findMany({
        select: { eventType: true, device: true, createdAt: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: twentyFourHoursAgo } },
        select: { eventType: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { eventType: 'page_view' },
        distinct: ['ipHash'],
        select: { ipHash: true },
      }),
    ]);

    const pageViews = totalEvents.filter((e) => e.eventType === 'page_view').length;
    const appDownloads = totalEvents.filter((e) => e.eventType === 'app_download').length;
    const uniqueVisitors = Math.max(uniqueVisitorRows.length, pageViews > 0 ? 1 : 0);
    const todayViews = recentEvents.filter((e) => e.eventType === 'page_view').length;
    const todayDownloads = recentEvents.filter((e) => e.eventType === 'app_download').length;
    const downloadConversionRate = uniqueVisitors > 0 ? Math.round((appDownloads / uniqueVisitors) * 1000) / 10 : 0;

    // Device breakdown
    const deviceCounts: Record<string, number> = { mobile: 0, desktop: 0, pwa: 0, other: 0 };
    for (const e of totalEvents) {
      const dev = (e.device || 'other').toLowerCase();
      if (dev.includes('mobile') || dev.includes('android') || dev.includes('ios')) deviceCounts.mobile++;
      else if (dev.includes('pwa')) deviceCounts.pwa++;
      else if (dev.includes('desktop')) deviceCounts.desktop++;
      else deviceCounts.other++;
    }

    // 2. Supplier Time-to-Action (Signup -> 1st Product Upload)
    const businesses = await prisma.business.findMany({
      include: {
        products: {
          select: { id: true, createdAt: true, name: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const supplierFunnels = businesses.map((b) => {
      const signupTime = b.createdAt.getTime();
      const firstProduct = b.products[0];
      const hasUploaded = b.products.length > 0;
      let timeToActionMinutes: number | null = null;
      let timeToActionFormatted = 'No Products Yet';

      if (hasUploaded && firstProduct) {
        timeToActionMinutes = Math.max(1, Math.round((firstProduct.createdAt.getTime() - signupTime) / (60 * 1000)));
        if (timeToActionMinutes < 60) {
          timeToActionFormatted = `${timeToActionMinutes} mins`;
        } else if (timeToActionMinutes < 24 * 60) {
          const hours = Math.round((timeToActionMinutes / 60) * 10) / 10;
          timeToActionFormatted = `${hours} hrs`;
        } else {
          const days = Math.round((timeToActionMinutes / (24 * 60)) * 10) / 10;
          timeToActionFormatted = `${days} days`;
        }
      } else {
        const pendingMins = Math.round((now.getTime() - signupTime) / (60 * 1000));
        const pendingDays = Math.round((pendingMins / (24 * 60)) * 10) / 10;
        timeToActionFormatted = `Pending (${pendingDays}d)`;
      }

      return {
        id: b.id,
        name: b.name,
        tradeName: b.tradeName,
        phone: b.phone,
        subcity: b.subcity,
        verificationStatus: b.verificationStatus,
        registeredAt: b.createdAt.toISOString(),
        hasUploadedProduct: hasUploaded,
        firstProductAt: firstProduct ? firstProduct.createdAt.toISOString() : null,
        firstProductName: firstProduct ? firstProduct.name : null,
        timeToActionMinutes,
        timeToActionFormatted,
        catalogSize: b.products.length,
        status: hasUploaded ? 'Active Catalog' : 'Catalog Pending',
      };
    });

    const suppliersWithUploads = supplierFunnels.filter((s) => s.hasUploadedProduct && s.timeToActionMinutes !== null);
    const supplierMinutesArr = suppliersWithUploads.map((s) => s.timeToActionMinutes!).sort((a, b) => a - b);
    const medianSupplierMinutes = supplierMinutesArr.length > 0
      ? supplierMinutesArr[Math.floor(supplierMinutesArr.length / 2)]
      : 0;

    let medianSupplierTimeFormatted = 'N/A';
    if (medianSupplierMinutes > 0) {
      if (medianSupplierMinutes < 60) medianSupplierTimeFormatted = `${medianSupplierMinutes} mins`;
      else if (medianSupplierMinutes < 1440) medianSupplierTimeFormatted = `${(medianSupplierMinutes / 60).toFixed(1)} hrs`;
      else medianSupplierTimeFormatted = `${(medianSupplierMinutes / 1440).toFixed(1)} days`;
    }

    const fastSuppliersCount = suppliersWithUploads.filter((s) => (s.timeToActionMinutes || 0) <= 24 * 60).length;
    const stalledSuppliersCount = supplierFunnels.filter((s) => !s.hasUploadedProduct).length;
    const supplierActivationRate = supplierFunnels.length > 0
      ? Math.round((suppliersWithUploads.length / supplierFunnels.length) * 100)
      : 0;

    // 3. Sales Agent Time-to-Action (Signup -> 1st Sale Closed)
    const salesPartners = await prisma.salesPartner.findMany({
      include: {
        orders: {
          where: { status: { in: ['CONFIRMED', 'SCHEDULED', 'DISPATCHED', 'DELIVERED'] } },
          select: { id: true, createdAt: true, orderNumber: true, totalAmount: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const agentFunnels = salesPartners.map((sp) => {
      const signupTime = sp.createdAt.getTime();
      const firstSale = sp.orders[0];
      const hasSold = sp.orders.length > 0;
      let timeToSaleHours: number | null = null;
      let timeToSaleFormatted = 'No Sales Yet';

      if (hasSold && firstSale) {
        timeToSaleHours = Math.max(0.1, Math.round(((firstSale.createdAt.getTime() - signupTime) / (60 * 60 * 1000)) * 10) / 10);
        if (timeToSaleHours < 24) {
          timeToSaleFormatted = `${timeToSaleHours} hrs`;
        } else {
          const days = Math.round((timeToSaleHours / 24) * 10) / 10;
          timeToSaleFormatted = `${days} days`;
        }
      } else {
        const pendingHours = Math.round((now.getTime() - signupTime) / (60 * 60 * 1000));
        const pendingDays = Math.round((pendingHours / 24) * 10) / 10;
        timeToSaleFormatted = `Onboarding (${pendingDays}d)`;
      }

      return {
        id: sp.id,
        fullName: sp.fullName,
        phone: sp.phone,
        subcity: sp.subcity,
        referralCode: sp.referralCode,
        registeredAt: sp.createdAt.toISOString(),
        hasMadeSale: hasSold,
        firstSaleAt: firstSale ? firstSale.createdAt.toISOString() : null,
        firstSaleOrderNumber: firstSale ? firstSale.orderNumber : null,
        timeToSaleHours,
        timeToSaleFormatted,
        totalSalesCount: sp.orders.length,
        totalAttributedSales: Number(sp.totalAttributedSales || 0),
        status: hasSold ? 'Active Seller' : 'Onboarding',
      };
    });

    const agentsWithSales = agentFunnels.filter((a) => a.hasMadeSale && a.timeToSaleHours !== null);
    const agentHoursArr = agentsWithSales.map((a) => a.timeToSaleHours!).sort((a, b) => a - b);
    const medianAgentHours = agentHoursArr.length > 0
      ? agentHoursArr[Math.floor(agentHoursArr.length / 2)]
      : 0;

    let medianAgentTimeFormatted = 'N/A';
    if (medianAgentHours > 0) {
      if (medianAgentHours < 24) medianAgentTimeFormatted = `${medianAgentHours} hrs`;
      else medianAgentTimeFormatted = `${(medianAgentHours / 24).toFixed(1)} days`;
    }

    const fastAgentsCount = agentsWithSales.filter((a) => (a.timeToSaleHours || 0) <= 24).length;
    const stalledAgentsCount = agentFunnels.filter((a) => !a.hasMadeSale).length;
    const agentActivationRate = agentFunnels.length > 0
      ? Math.round((agentsWithSales.length / agentFunnels.length) * 100)
      : 0;

    // 4. Fast-Moving Products (Sales Velocity)
    const allProducts = await prisma.product.findMany({
      include: {
        business: { select: { id: true, name: true, phone: true } },
        orderItems: {
          include: {
            order: { select: { id: true, status: true, createdAt: true } },
          },
        },
      },
    });

    const productVelocityList = allProducts.map((p) => {
      const validItems = p.orderItems.filter((it) =>
        ['CONFIRMED', 'SCHEDULED', 'DISPATCHED', 'DELIVERED'].includes(it.order?.status || '')
      );

      const totalUnitsSold = validItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const totalRevenue = validItems.reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
      const totalCommission = validItems.reduce((sum, it) => sum + Number(it.commissionAmount || 0), 0);
      const orderCount = validItems.length;

      // Calculate days active (since product creation or first sale)
      const daysActive = Math.max(1, Math.round((now.getTime() - p.createdAt.getTime()) / (24 * 60 * 60 * 1000)));
      const dailyVelocity = Math.round((totalUnitsSold / daysActive) * 100) / 100;

      // Velocity classification
      let velocityTier: 'HIGH' | 'MODERATE' | 'STANDARD' | 'LOW' = 'LOW';
      if (totalUnitsSold >= 10 || dailyVelocity >= 1.0) velocityTier = 'HIGH';
      else if (totalUnitsSold >= 4 || dailyVelocity >= 0.3) velocityTier = 'MODERATE';
      else if (totalUnitsSold >= 1) velocityTier = 'STANDARD';

      // Estimated days of supply left before stockout
      const daysOfSupply = dailyVelocity > 0 ? Math.round(p.stock / dailyVelocity) : null;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        imageUrl: p.imageUrl,
        unitPrice: Number(p.unitPrice),
        currentStock: p.stock,
        supplierId: p.businessId,
        supplierName: p.business?.name || 'Merchant',
        totalUnitsSold,
        totalRevenue,
        totalCommission,
        orderCount,
        dailyVelocity,
        velocityTier,
        daysOfSupply,
        isStockLow: p.stock > 0 && p.stock <= 10,
        isOutOfStock: p.stock === 0,
      };
    }).sort((a, b) => b.totalUnitsSold - a.totalUnitsSold || b.dailyVelocity - a.dailyVelocity);

    const payload = {
      success: true,
      traffic: {
        totalPageViews: pageViews,
        uniqueVisitors,
        todayViews,
        appDownloads,
        todayDownloads,
        downloadConversionRate,
        deviceCounts,
      },
      supplierMetrics: {
        totalSuppliers: supplierFunnels.length,
        activeSuppliersCount: suppliersWithUploads.length,
        stalledSuppliersCount,
        fastSuppliersCount,
        activationRate: supplierActivationRate,
        medianTimeToCatalog: medianSupplierTimeFormatted,
        funnel: [
          { stage: 'Registered Suppliers', count: supplierFunnels.length, percentage: 100 },
          { stage: 'Uploaded >= 1 Product', count: suppliersWithUploads.length, percentage: supplierActivationRate },
          { stage: 'Received Fulfillment Order', count: supplierFunnels.filter((s) => s.catalogSize > 0).length, percentage: supplierActivationRate },
        ],
        suppliers: supplierFunnels,
      },
      agentMetrics: {
        totalAgents: agentFunnels.length,
        activeAgentsCount: agentsWithSales.length,
        stalledAgentsCount,
        fastAgentsCount,
        activationRate: agentActivationRate,
        medianTimeToFirstSale: medianAgentTimeFormatted,
        funnel: [
          { stage: 'Registered Sales Agents', count: agentFunnels.length, percentage: 100 },
          { stage: 'Closed 1st Verified Sale', count: agentsWithSales.length, percentage: agentActivationRate },
          { stage: 'Repeat Producers (3+ Sales)', count: agentFunnels.filter((a) => a.totalSalesCount >= 3).length, percentage: agentFunnels.length > 0 ? Math.round((agentFunnels.filter((a) => a.totalSalesCount >= 3).length / agentFunnels.length) * 100) : 0 },
        ],
        agents: agentFunnels,
      },
      productVelocity: {
        fastMovingProducts: productVelocityList.slice(0, 15),
        allProducts: productVelocityList,
        totalCatalogItems: allProducts.length,
        totalUnitsDispatched: productVelocityList.reduce((sum, p) => sum + p.totalUnitsSold, 0),
      },
    };

    await cacheService.set(cacheKey, payload, 30);
    res.status(200).json(payload);
  } catch (error: any) {
    console.error('[Analytics Funnels Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to compute analytics funnels' });
  }
});

/**
 * POST /api/analytics/nudge
 * Admin dispatches follow-up SMS to a stalled supplier or sales agent
 */
analyticsRouter.post('/nudge', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, message } = req.body;

    if (!targetType || !targetId) {
      res.status(400).json({ success: false, error: 'targetType (supplier|agent) and targetId are required' });
      return;
    }

    let phone = '';
    let name = '';

    if (targetType === 'supplier') {
      const biz = await prisma.business.findUnique({ where: { id: targetId } });
      if (!biz || !biz.phone) {
        res.status(404).json({ success: false, error: 'Supplier phone not found' });
        return;
      }
      phone = biz.phone;
      name = biz.name;
    } else {
      const agent = await prisma.salesPartner.findUnique({ where: { id: targetId } });
      if (!agent || !agent.phone) {
        res.status(404).json({ success: false, error: 'Sales agent phone not found' });
        return;
      }
      phone = agent.phone;
      name = agent.fullName;
    }

    const defaultMsg = targetType === 'supplier'
      ? `Hello ${name}! Your Azwari supplier account is ready. 100+ active Addis sales agents are waiting to market your items. Log in at https://arifagent-ethiopian-sales-agent-mar.vercel.app/signin to upload your first product!`
      : `Hello ${name}! Welcome to Azwari. Check out today's top-moving Ethiopian products with high commission rates. Share your catalog link to earn your first commission!`;

    const messageBody = message || defaultMsg;

    await SmsEthiopiaService.sendSms({
      recipientPhone: phone,
      messageBody,
      orderNumber: `NUDGE-${targetId.substring(0, 8)}`,
      templateName: targetType === 'supplier' ? 'supplier_nudge' : 'agent_nudge',
    });

    res.status(200).json({ success: true, message: `Notification sent to ${name} (${phone})` });
  } catch (error: any) {
    console.error('[Analytics Nudge Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to dispatch notification' });
  }
});

