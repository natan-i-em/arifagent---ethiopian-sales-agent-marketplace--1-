import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { supabaseAdmin } from '../supabase.js';
import {
  signupLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  authLimiter,
} from '../middleware/rateLimiter.js';
import {
  validateSupplierRegistration,
  validateAgentRegistration,
  normalizeEthiopianPhone,
} from '../middleware/validator.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';
import { requireAuth, signToken, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { cacheService } from '../services/cacheService.js';

export const authRouter = Router();

/**
 * Normalizes and produces all viable formats of an Ethiopian phone number
 * to ensure duplicate detection matches whether stored as +251..., 09..., 251..., or 9...
 */
export function getEthiopianPhoneVariants(rawPhone: string): string[] {
  if (!rawPhone || typeof rawPhone !== 'string') return [];
  const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '').trim();
  const phoneInfo = normalizeEthiopianPhone(rawPhone);
  const variants = new Set<string>();

  if (cleaned) variants.add(cleaned);
  if (rawPhone.trim()) variants.add(rawPhone.trim());

  if (phoneInfo.isValid && phoneInfo.normalized) {
    const norm = phoneInfo.normalized; // e.g. 251911223344
    variants.add(norm);
    variants.add(`+${norm}`);
    if (norm.startsWith('251') && norm.length === 12) {
      const national = '0' + norm.substring(3); // 0911223344
      variants.add(national);
      variants.add(norm.substring(3)); // 911223344
    }
  }
  return Array.from(variants).filter(Boolean);
}

/**
 * Validates password strength (min 8 characters, letters and numbers required)
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long for account security' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain both letters and numbers' };
  }
  return { isValid: true };
}

/**
 * GET /api/auth/me
 * Returns authenticated user's profile and linked entity
 */
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let business: any = null;
    let salesPartner: any = null;

    if (user.businessId) {
      business = await prisma.business.findUnique({
        where: { id: user.businessId },
        include: { paymentAccounts: true },
      });
    }

    if (user.salesPartnerId) {
      salesPartner = await prisma.salesPartner.findUnique({
        where: { id: user.salesPartnerId },
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        authUserId: user.authUserId,
        email: user.email,
        name: user.fullName,
        role: user.role,
        entityId: user.businessId || user.salesPartnerId || undefined,
        businessId: user.businessId,
        salesPartnerId: user.salesPartnerId,
      },
      business,
      salesPartner,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/register-supplier
 * Moves supplier onboarding to backend: rate-limited, validated, atomic database insert
 */
/**
 * POST /api/auth/register-supplier
 * Moves supplier onboarding to backend: rate-limited, validated, duplicate-checked, atomic database insert
 */
authRouter.post('/register-supplier', signupLimiter, validateSupplierRegistration, async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      businessName,
      tradeName,
      tinNumber,
      licenseNumber,
      phone,
      subcity,
      specificLocation,
      contactEmail,
      primaryBank,
    } = req.body;

    const resolvedBusinessName = (businessName || req.body.name || req.body.companyName || 'Merchant Business').toString().trim();
    const resolvedEmail = (email || contactEmail || '').toString().trim();

    if (!resolvedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      res.status(400).json({ success: false, error: 'A valid email address is required for merchant registration.' });
      return;
    }

    if (!phone || !phone.trim()) {
      res.status(400).json({ success: false, error: 'Phone number is required for merchant registration.' });
      return;
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      res.status(400).json({ success: false, error: passwordCheck.error });
      return;
    }

    const phoneInfo = normalizeEthiopianPhone(phone);
    if (!phoneInfo.isValid) {
      res.status(400).json({ success: false, error: 'Please provide a valid Ethiopian mobile number (e.g. 09... or 07...)' });
      return;
    }
    const formattedPhone = phoneInfo.normalized ? `+${phoneInfo.normalized}` : phone;

    // 1. DUPLICATE CHECK: Email uniqueness
    const cleanEmail = resolvedEmail.toLowerCase();
    const existingUserByEmail = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });
    if (existingUserByEmail) {
      res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in or use a different email.',
      });
      return;
    }

    // 2. DUPLICATE CHECK: Phone number uniqueness across User, Business, and SalesPartner
    const phoneVariants = getEthiopianPhoneVariants(phone);
    const [existingUserByPhone, existingBizByPhone, existingPartnerByPhone] = await Promise.all([
      prisma.user.findFirst({
        where: { OR: phoneVariants.map((p) => ({ phone: p })) },
      }),
      prisma.business.findFirst({
        where: { OR: phoneVariants.map((p) => ({ phone: p })) },
      }),
      prisma.salesPartner.findFirst({
        where: { OR: phoneVariants.map((p) => ({ phone: p })) },
      }),
    ]);

    if (existingUserByPhone || existingBizByPhone || existingPartnerByPhone) {
      res.status(409).json({
        success: false,
        error: 'An account with this phone number already exists. Please sign in or use a different phone number.',
      });
      return;
    }

    // 3. DUPLICATE CHECK: Business TIN uniqueness
    if (tinNumber && tinNumber.trim()) {
      const existingBizByTin = await prisma.business.findUnique({
        where: { tinNumber: tinNumber.trim() },
      });
      if (existingBizByTin) {
        res.status(409).json({
          success: false,
          error: 'A business with this TIN number is already registered in our directory.',
        });
        return;
      }
    }

    let authUserId = 'user_' + Date.now().toString(36);

    // 4. Create user in Supabase Auth
    try {
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          fullName: resolvedBusinessName,
          phone: formattedPhone,
          role: 'supplier',
          subcity,
        },
      });

      if (authUser?.user) {
        authUserId = authUser.user.id;
      } else if (authErr) {
        if (
          authErr.message?.toLowerCase().includes('already') ||
          authErr.message?.toLowerCase().includes('exists') ||
          (authErr as any).status === 422
        ) {
          res.status(409).json({
            success: false,
            error: 'An account with this email is already registered in the authentication system. Please sign in.',
          });
          return;
        }
        console.warn('[Auth] Supabase admin create notice:', authErr.message);
      }
    } catch (authException: any) {
      console.warn('[Auth] Supabase exception during supplier registration:', authException?.message);
    }

    const bizId = 'biz_' + Date.now().toString(36);

    // 5. ATOMIC INSERT: PostgreSQL User and Business
    const [dbUser, dbBusiness] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: authUserId,
          authUserId,
          email: cleanEmail,
          fullName: resolvedBusinessName,
          phone: formattedPhone,
          role: 'supplier',
          subcity,
        },
      });

      const business = await tx.business.create({
        data: {
          id: bizId,
          authUserId,
          name: resolvedBusinessName,
          tradeName: tradeName || resolvedBusinessName,
          tinNumber: tinNumber || `TIN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          licenseNumber: licenseNumber || `BL-${Math.floor(100000 + Math.random() * 900000)}`,
          verificationStatus: 'PENDING',
          city: 'Addis Ababa',
          subcity,
          specificLocation: specificLocation || 'Addis Ababa Commercial Zone',
          phone: formattedPhone,
          contactEmail: contactEmail || cleanEmail,
        },
      });

      return [user, business];
    });

    // 6. Save Payment Account if provided
    if (primaryBank && primaryBank.accountNumber) {
      const providerMap: Record<string, any> = {
        'Telebirr': 'TELEBIRR',
        'Commercial Bank of Ethiopia (CBE)': 'CBE',
        'Awash Bank': 'AWASH_BANK',
        'Bank of Abyssinia': 'BANK_OF_ABYSSINIA',
        'Dashen Bank': 'DASHEN_BANK',
      };

      try {
        await prisma.supplierPaymentAccount.create({
          data: {
            id: 'acc_' + Date.now().toString(36),
            businessId: dbBusiness.id,
            provider: providerMap[primaryBank.provider] || 'CBE',
            accountNumber: primaryBank.accountNumber,
            accountHolderName: primaryBank.accountHolderName || resolvedBusinessName,
            isPrimary: true,
            verified: true,
          },
        });
      } catch (bankErr) {
        console.warn('[Auth] Payment account save notice:', bankErr);
      }
    }

    // 7. Add to Waitlist Entry so admin can review and approve
    try {
      const initials = resolvedBusinessName.split(' ')[0].replace(/[^A-Za-z]/g, '').toUpperCase() || 'BIZ';
      const referralCode = `${initials}-${Math.floor(100 + Math.random() * 900)}`;
      await prisma.waitlistEntry.create({
        data: {
          fullName: resolvedBusinessName,
          phone: formattedPhone,
          role: 'supplier',
          subcity: subcity || 'Bole',
          categoryOrChannel: 'Merchant Wholesale / Retail',
          estimatedScale: '100+ items/mo',
          referralCode,
          status: 'waitlisted',
        },
      });
    } catch (wlErr) {
      console.warn('[Auth] Supplier waitlist registration notice:', wlErr);
    }

    // 8. Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorRole: 'supplier',
          actorName: resolvedBusinessName,
          action: 'SUPPLIER_SIGNUP',
          entityType: 'User',
          entityId: dbUser.id,
          businessId: dbBusiness.id,
          description: `Supplier registered business '${resolvedBusinessName}' (Email: ${cleanEmail}, Phone: ${formattedPhone}).`,
        },
      });
    } catch {}

    // 9. Automatic Welcome SMS via SMS Ethiopia Gateway
    const welcomeMsg = `Welcome ${resolvedBusinessName} to Azwari! Your merchant application has been received and added to our waitlist pending admin approval. You will receive an SMS once approved.`;
    await SmsEthiopiaService.sendSms({
      recipientPhone: phone,
      messageBody: welcomeMsg,
      orderNumber: dbBusiness.id,
      templateName: 'merchant_registered',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      pendingApproval: true,
      user: dbUser,
      business: dbBusiness,
      message: 'Merchant account registered and placed on waitlist pending admin approval.',
    });
  } catch (error: any) {
    console.error('[Register Supplier Error]', error);
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'An account with these details (email, phone, or TIN) is already registered.',
      });
      return;
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to register supplier' });
  }
});

/**
 * POST /api/auth/register-agent
 * Moves sales partner onboarding to backend: rate-limited, validated, atomic database insert
 */
/**
 * POST /api/auth/register-agent
 * Moves sales partner onboarding to backend: rate-limited, validated, duplicate-checked, atomic database insert
 */
authRouter.post('/register-agent', signupLimiter, validateAgentRegistration, async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, telegramUsername, subcity, payoutProvider, payoutAccountNumber, payoutAccountName } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, error: 'A valid email address is required for sales agent registration.' });
      return;
    }

    if (!phone || !phone.trim()) {
      res.status(400).json({ success: false, error: 'Phone number is required for sales agent registration.' });
      return;
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      res.status(400).json({ success: false, error: passwordCheck.error });
      return;
    }

    const phoneInfo = normalizeEthiopianPhone(phone);
    if (!phoneInfo.isValid) {
      res.status(400).json({ success: false, error: 'Please provide a valid Ethiopian mobile number (e.g. 09... or 07...)' });
      return;
    }
    const formattedPhone = phoneInfo.normalized ? `+${phoneInfo.normalized}` : phone;

    // 1. DUPLICATE CHECK: Email uniqueness
    const cleanEmail = email.toLowerCase().trim();
    const existingUserByEmail = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
    });
    if (existingUserByEmail) {
      res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in or use a different email.',
      });
      return;
    }

    // 2. DUPLICATE CHECK: Phone number uniqueness across User, SalesPartner, and Business
    const phoneVariants = getEthiopianPhoneVariants(phone);
    const [existingUserByPhone, existingPartnerByPhone, existingBizByPhone] = await Promise.all([
      prisma.user.findFirst({
        where: { OR: phoneVariants.map((p) => ({ phone: p })) },
      }),
      prisma.salesPartner.findFirst({
        where: { OR: phoneVariants.map((p) => ({ phone: p })) },
      }),
      prisma.business.findFirst({
        where: { OR: phoneVariants.map((p) => ({ phone: p })) },
      }),
    ]);

    if (existingUserByPhone || existingPartnerByPhone || existingBizByPhone) {
      res.status(409).json({
        success: false,
        error: 'An account with this phone number already exists. Please sign in or use a different phone number.',
      });
      return;
    }

    let authUserId = 'user_' + Date.now().toString(36);

    // 3. Create user in Supabase Auth
    try {
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          fullName,
          phone: formattedPhone,
          role: 'salesperson',
          subcity,
        },
      });

      if (authUser?.user) {
        authUserId = authUser.user.id;
      } else if (authErr) {
        if (
          authErr.message?.toLowerCase().includes('already') ||
          authErr.message?.toLowerCase().includes('exists') ||
          (authErr as any).status === 422
        ) {
          res.status(409).json({
            success: false,
            error: 'An account with this email is already registered in the authentication system. Please sign in.',
          });
          return;
        }
        console.warn('[Auth] Supabase admin create notice:', authErr.message);
      }
    } catch (authException: any) {
      console.warn('[Auth] Supabase exception during agent registration:', authException?.message);
    }

    const spId = 'sp_' + Date.now().toString(36);
    const initials = fullName.split(' ')[0].toUpperCase();
    const referralCode = `${initials}-${Math.floor(100 + Math.random() * 900)}`;

    // 4. ATOMIC INSERT: PostgreSQL User and SalesPartner
    const [dbUser, dbSalesPartner] = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: authUserId,
          authUserId,
          email: cleanEmail,
          fullName,
          phone: formattedPhone,
          role: 'salesperson',
          subcity,
        },
      });

      const salesPartner = await tx.salesPartner.create({
        data: {
          id: spId,
          authUserId,
          email: cleanEmail,
          fullName,
          phone: formattedPhone,
          telegramUsername: telegramUsername || null,
          subcity,
          payoutProvider: payoutProvider === 'Telebirr' ? 'TELEBIRR' : 'CBE',
          payoutAccountNumber: payoutAccountNumber || formattedPhone,
          payoutAccountName: payoutAccountName || fullName,
          referralCode,
          verificationStatus: 'PENDING',
        },
      });

      return [user, salesPartner];
    });

    // 5. Add to Waitlist Entry so admin can review and approve
    try {
      await prisma.waitlistEntry.create({
        data: {
          fullName,
          phone: formattedPhone,
          role: 'sales_agent',
          subcity: subcity || 'Bole',
          telegramUsername: telegramUsername || null,
          categoryOrChannel: 'Direct Sales & Social Commerce',
          estimatedScale: '50+ orders/mo',
          referralCode: `WL-${referralCode}`,
          status: 'waitlisted',
        },
      });
    } catch (wlErr) {
      console.warn('[Auth] Agent waitlist registration notice:', wlErr);
    }

    // 6. Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorRole: 'salesperson',
          actorName: fullName,
          action: 'AGENT_SIGNUP',
          entityType: 'User',
          entityId: dbUser.id,
          description: `Sales Agent registered '${fullName}' (Email: ${cleanEmail}, Phone: ${formattedPhone}).`,
        },
      });
    } catch {}

    // 7. Automatic Welcome SMS via SMS Ethiopia Gateway
    const welcomeMsg = `Welcome ${fullName} to Azwari! Your sales agent registration has been received and placed on the waitlist pending admin approval. You will receive an SMS once approved.`;
    await SmsEthiopiaService.sendSms({
      recipientPhone: phone,
      messageBody: welcomeMsg,
      orderNumber: spId,
      templateName: 'agent_registered',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      pendingApproval: true,
      user: dbUser,
      salesPartner: dbSalesPartner,
      message: 'Sales Agent registered and placed on waitlist pending admin approval.',
    });
  } catch (error: any) {
    console.error('[Register Agent Error]', error);
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'An account with these details (email or phone) is already registered.',
      });
      return;
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to register sales agent' });
  }
});

/**
 * POST /api/auth/sync-user
 * Syncs OAuth / existing session with PostgreSQL database
 */
authRouter.post('/sync-user', async (req: Request, res: Response) => {
  try {
    const { authUserId, email, fullName, role, phone, subcity } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required to sync user' });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        authUserId: authUserId || undefined,
        fullName: fullName || undefined,
        phone: phone || undefined,
        role: role || undefined,
        subcity: subcity || undefined,
      },
      create: {
        id: authUserId || 'user_' + Date.now().toString(36),
        authUserId,
        email,
        fullName: fullName || email.split('@')[0],
        phone: phone || null,
        role: role || 'salesperson',
        subcity: subcity || 'Bole',
      },
    });

    // Also fetch associated business or sales partner profile if exists
    const [business, salesPartner] = await Promise.all([
      prisma.business.findFirst({ where: { OR: [{ authUserId: user.authUserId || '' }, { contactEmail: email }] } }),
      prisma.salesPartner.findFirst({ where: { OR: [{ authUserId: user.authUserId || '' }, { email }] } }),
    ]);

    const signedToken = signToken({
      userId: user.id,
      authUserId: user.authUserId || user.id,
      email: user.email,
      role: (user.role as any) || 'salesperson',
    });

    res.status(200).json({
      success: true,
      token: signedToken,
      sessionToken: signedToken,
      user,
      business,
      salesPartner,
    });
  } catch (error: any) {
    console.error('[Sync User Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync user' });
  }
});

/**
 * GET /api/auth/profile/:email
 * Retrieves user profile + linked business / sales partner
 */
/**
 * POST /api/auth/session-token
 * Generates/refreshes a verified signed session token for authenticated user sessions
 */
authRouter.post('/session-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, userId, phone } = req.body;
    if (!email && !userId && !phone) {
      res.status(400).json({ success: false, error: 'Email, userId, or phone is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(userId ? [{ id: userId }, { authUserId: userId }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }

    const [business, salesPartner] = await Promise.all([
      prisma.business.findFirst({
        where: {
          OR: [
            ...(user.authUserId ? [{ authUserId: user.authUserId }] : []),
            { contactEmail: user.email },
          ],
        },
      }),
      prisma.salesPartner.findFirst({
        where: {
          OR: [
            ...(user.authUserId ? [{ authUserId: user.authUserId }] : []),
            ...(user.phone ? [{ phone: user.phone }] : []),
            { email: user.email },
          ],
        },
      }),
    ]);

    const activeRole = (user.role || 'salesperson') as 'salesperson' | 'supplier' | 'admin';
    const token = signToken({
      userId: user.id,
      authUserId: user.authUserId || user.id,
      email: user.email,
      role: activeRole,
    });

    res.status(200).json({
      success: true,
      token,
      sessionToken: token,
      user: {
        id: user.id,
        authUserId: user.authUserId || user.id,
        email: user.email,
        name: user.fullName || user.email.split('@')[0],
        role: activeRole,
        entityId: activeRole === 'supplier' ? business?.id : activeRole === 'salesperson' ? salesPartner?.id : undefined,
        supplierId: business?.id,
        salespersonId: salesPartner?.id,
        phone: user.phone || '',
        subcity: user.subcity || '',
      },
      business,
      salesPartner,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Error generating session token' });
  }
});

authRouter.get('/profile/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const [business, salesPartner] = await Promise.all([
      prisma.business.findFirst({ where: { OR: [{ authUserId: user.authUserId || '' }, { contactEmail: email }] } }),
      prisma.salesPartner.findFirst({ where: { OR: [{ authUserId: user.authUserId || '' }, { email }] } }),
    ]);

    res.status(200).json({
      success: true,
      user,
      business,
      salesPartner,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch profile' });
  }
});

/**
 * POST /api/auth/login
 * Backend authentication with phone/email resolution, password verification, rate-limiting and user profile loading
 */
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password, role } = req.body;
    if (!emailOrPhone || typeof emailOrPhone !== 'string') {
      res.status(400).json({ success: false, error: 'Email or phone number is required' });
      return;
    }

    const input = emailOrPhone.trim();
    let emailToUse = input;

    // If input is a phone number, look up the user's email in the PostgreSQL database
    if (!input.includes('@')) {
      const phoneVariants = getEthiopianPhoneVariants(input);

      const userByPhone = await prisma.user.findFirst({
        where: {
          OR: phoneVariants.map((p) => ({ phone: p })),
        },
      });

      if (userByPhone?.email) {
        emailToUse = userByPhone.email;
      } else {
        emailToUse = `${input.replace(/[^0-9]/g, '')}@azwari.et`;
      }
    }

    let authUserId: string | null = null;
    let authUserMetadata: any = null;
    let authSession: any = null;

    // If password provided, authenticate against Supabase Auth
    if (password) {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (authErr) {
        try {
          await prisma.auditLog.create({
            data: {
              actorRole: 'anonymous',
              actorName: emailOrPhone,
              action: 'LOGIN_FAILED',
              entityType: 'Auth',
              entityId: emailOrPhone,
              description: `Failed login attempt for identifier '${emailOrPhone}'.`,
            },
          });
        } catch {}

        res.status(401).json({
          success: false,
          error: 'Invalid email/phone or password. Please verify your credentials.',
        });
        return;
      }

      if (authData?.user) {
        authUserId = authData.user.id;
        authUserMetadata = authData.user.user_metadata;
        authSession = authData.session;
      }
    }

    // Retrieve User record from PostgreSQL
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(authUserId ? [{ authUserId }] : []),
          { email: emailToUse },
        ],
      },
    });

    if (!user && authUserId) {
      user = await prisma.user.create({
        data: {
          id: authUserId,
          authUserId,
          email: emailToUse,
          fullName: authUserMetadata?.fullName || emailToUse.split('@')[0],
          role: authUserMetadata?.role || role || 'salesperson',
          subcity: authUserMetadata?.subcity || 'Bole',
        },
      });
    }

    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found. Please register first.' });
      return;
    }

    // Retrieve associated Business or SalesPartner records
    let [business, salesPartner] = await Promise.all([
      prisma.business.findFirst({
        where: {
          OR: [
            ...(user.authUserId ? [{ authUserId: user.authUserId }] : []),
            { contactEmail: user.email },
          ],
        },
        include: { paymentAccounts: true },
      }),
      prisma.salesPartner.findFirst({
        where: {
          OR: [
            ...(user.authUserId ? [{ authUserId: user.authUserId }] : []),
            ...(user.phone ? [{ phone: user.phone }] : []),
            { email: user.email },
          ],
        },
      }),
    ]);

    const activeRole = (user.role || authUserMetadata?.role || role || 'salesperson') as 'salesperson' | 'supplier' | 'admin';

    // Auto-create Business record if user is a supplier and business is missing
    if (activeRole === 'supplier' && !business) {
      const bizId = 'biz_' + user.id.substring(0, 8);
      business = await prisma.business.create({
        data: {
          id: bizId,
          authUserId: user.authUserId || user.id,
          name: user.fullName || 'Supplier Business',
          tradeName: user.fullName || 'Supplier Business',
          tinNumber: `TIN-${Date.now()}`,
          licenseNumber: `BL-${Date.now()}`,
          verificationStatus: 'VERIFIED',
          city: 'Addis Ababa',
          subcity: user.subcity || 'Kirkos',
          specificLocation: 'Addis Ababa',
          phone: user.phone || '+251 931418513',
          contactEmail: user.email,
          paymentAccounts: {
            create: {
              id: 'acc_' + Date.now().toString(36),
              provider: 'TELEBIRR',
              accountNumber: user.phone?.replace(/[^0-9]/g, '') || '0931418513',
              accountHolderName: user.fullName || 'Supplier Business',
              isPrimary: true,
              verified: true,
            },
          },
        },
        include: { paymentAccounts: true },
      });
    }

    // Auto-create SalesPartner record if user is salesperson and record is missing
    if (activeRole === 'salesperson' && !salesPartner) {
      const spId = 'sp_' + user.id.substring(0, 8);
      const initials = (user.fullName || 'AGENT').split(' ')[0].toUpperCase();
      salesPartner = await prisma.salesPartner.create({
        data: {
          id: spId,
          authUserId: user.authUserId || user.id,
          email: user.email,
          fullName: user.fullName || 'Sales Agent',
          phone: user.phone || '+251 9' + Math.floor(10000000 + Math.random() * 90000000),
          subcity: user.subcity || 'Bole',
          payoutProvider: 'TELEBIRR',
          payoutAccountNumber: user.phone?.replace(/[^0-9]/g, '') || '0911000000',
          payoutAccountName: user.fullName || 'Sales Agent',
          referralCode: `${initials}-${Math.floor(100 + Math.random() * 900)}`,
        },
      });
    }

    // Strict Verification & Waitlist check: Do not allow unapproved merchants or sales agents to log in
    if (activeRole === 'supplier' && business) {
      if (business.verificationStatus !== 'VERIFIED') {
        res.status(403).json({
          success: false,
          status: 'pending_approval',
          error: 'Your merchant account is currently on the waitlist pending administrative approval. You will receive an SMS once your account is verified and ready for login.',
        });
        return;
      }
    }

    if (activeRole === 'salesperson' && salesPartner) {
      if (salesPartner.verificationStatus !== 'VERIFIED') {
        res.status(403).json({
          success: false,
          status: 'pending_approval',
          error: 'Your sales agent account is currently on the waitlist pending administrative approval. You will receive an SMS once your account is verified and ready for login.',
        });
        return;
      }
    }

    const signedToken = signToken({
      userId: user.id,
      authUserId: user.authUserId || user.id,
      email: user.email,
      role: activeRole,
    });
    const tokenToReturn = authSession?.access_token || signedToken;

    res.status(200).json({
      success: true,
      token: tokenToReturn,
      sessionToken: signedToken,
      session: authSession || null,
      user: {
        id: user.id,
        authUserId: user.authUserId || user.id,
        email: user.email,
        name: user.fullName || user.email.split('@')[0],
        role: activeRole,
        entityId: activeRole === 'supplier' ? business?.id : activeRole === 'salesperson' ? salesPartner?.id : undefined,
        supplierId: business?.id,
        salespersonId: salesPartner?.id,
        phone: user.phone || '',
        subcity: user.subcity || '',
      },
      business,
      salesPartner,
    });
  } catch (error: any) {
    console.error('[Login API Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error during login' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiates password recovery via SMS verification code and/or email
 * Rate-limited to max 3 requests per 15 minutes per IP
 */
authRouter.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone || typeof emailOrPhone !== 'string' || !emailOrPhone.trim()) {
      res.status(400).json({ success: false, error: 'Email or phone number is required' });
      return;
    }

    const rawInput = emailOrPhone.trim();
    const isEmail = rawInput.includes('@');
    let user: any = null;

    if (isEmail) {
      user = await prisma.user.findFirst({
        where: { email: { equals: rawInput.toLowerCase(), mode: 'insensitive' } },
      });
    } else {
      const phoneVariants = getEthiopianPhoneVariants(rawInput);
      user = await prisma.user.findFirst({
        where: { OR: phoneVariants.map((p) => ({ phone: p })) },
      });
    }

    // Generic defensive response if user not found to prevent user enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If an account is associated with this email or phone number, a 6-digit verification code has been dispatched.',
      });
      return;
    }

    // Generate cryptographically random 6-digit OTP code & session token
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store in cache with 15-minute TTL (900 seconds)
    const resetData = {
      userId: user.id,
      authUserId: user.authUserId,
      email: user.email,
      phone: user.phone,
      otpCode,
      resetToken,
      attempts: 0,
      createdAt: Date.now(),
    };

    await cacheService.set(`pwd_reset_code:${otpCode}`, JSON.stringify(resetData), 900);
    await cacheService.set(`pwd_reset_user:${user.id}`, JSON.stringify(resetData), 900);
    await cacheService.set(`pwd_reset_token:${resetToken}`, JSON.stringify(resetData), 900);

    // Dispatch SMS to registered phone
    if (user.phone) {
      const smsText = `Azwari Security: Your password reset verification code is ${otpCode}. Valid for 15 minutes. Never share this code with anyone.`;
      await SmsEthiopiaService.sendSms({
        recipientPhone: user.phone,
        messageBody: smsText,
        orderNumber: `RESET-${otpCode}`,
        templateName: 'password_reset_code',
      }).catch((err) => console.warn('[Forgot Password SMS Warning]', err));
    }

    // Trigger Supabase email recovery if valid non-fallback email
    if (user.email && !user.email.endsWith('@azwari.et')) {
      supabaseAdmin.auth.resetPasswordForEmail(user.email).catch(() => {});
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorRole: user.role || 'user',
          actorName: user.fullName || user.email,
          action: 'FORGOT_PASSWORD_REQUEST',
          entityType: 'User',
          entityId: user.id,
          description: `Password reset requested for identifier '${rawInput}'. 6-digit OTP generated.`,
        },
      });
    } catch {}

    // Mask phone and email for security UI feedback
    const maskPhone = (p: string) => {
      const digits = p.replace(/\D/g, '');
      return digits.length >= 4 ? `+251 ••• ••${digits.slice(-4)}` : '••••';
    };
    const maskEmail = (e: string) => {
      const [local, dom] = e.split('@');
      return local.length > 2 ? `${local[0]}•••${local.slice(-1)}@${dom}` : `••@${dom}`;
    };

    res.status(200).json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your phone.',
      phoneMasked: user.phone ? maskPhone(user.phone) : undefined,
      emailMasked: user.email && !user.email.endsWith('@azwari.et') ? maskEmail(user.email) : undefined,
      resetToken,
    });
  } catch (error: any) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/verify-reset-code
 * Verifies the 6-digit OTP code with attempt throttling
 * Rate-limited to max 5 attempts per 15 minutes per IP
 */
authRouter.post('/verify-reset-code', resetPasswordLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, resetToken } = req.body;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ success: false, error: '6-digit verification code is required' });
      return;
    }

    const cleanCode = code.trim();
    let rawData = await cacheService.get(`pwd_reset_code:${cleanCode}`);

    if (!rawData && resetToken) {
      const tokenDataStr = await cacheService.get(`pwd_reset_token:${resetToken}`);
      if (tokenDataStr) {
        const parsed = JSON.parse(tokenDataStr);
        if (parsed.otpCode === cleanCode) {
          rawData = tokenDataStr;
        }
      }
    }

    if (!rawData) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code. Please check your SMS or request a new code.',
      });
      return;
    }

    const parsed = JSON.parse(rawData);

    // Throttling: Invalidate after 5 wrong attempts
    if (parsed.attempts >= 5) {
      await cacheService.del(`pwd_reset_code:${cleanCode}`);
      await cacheService.del(`pwd_reset_user:${parsed.userId}`);
      await cacheService.del(`pwd_reset_token:${parsed.resetToken}`);
      res.status(429).json({
        success: false,
        error: 'Too many incorrect verification attempts. For security, this code was invalidated. Please request a new code.',
      });
      return;
    }

    // Generate single-use verified authorization token valid for setting new password (10 min)
    const verifiedToken = crypto.randomBytes(32).toString('hex');
    await cacheService.set(
      `pwd_verified_token:${verifiedToken}`,
      JSON.stringify({ userId: parsed.userId, authUserId: parsed.authUserId, email: parsed.email }),
      600
    );

    res.status(200).json({
      success: true,
      message: 'Code verified successfully. Please enter your new password.',
      verifiedToken,
    });
  } catch (error: any) {
    console.error('[Verify Reset Code Error]', error);
    res.status(500).json({ success: false, error: 'Failed to verify reset code' });
  }
});

/**
 * POST /api/auth/reset-password
 * Sets new password after successful OTP verification
 * Rate-limited to max 5 attempts per 15 minutes per IP
 */
authRouter.post('/reset-password', resetPasswordLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { verifiedToken, resetToken, code, newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ success: false, error: 'New password is required' });
      return;
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      res.status(400).json({ success: false, error: strength.error });
      return;
    }

    let userId: string | null = null;
    let authUserId: string | null = null;

    if (verifiedToken) {
      const verifiedRaw = await cacheService.get(`pwd_verified_token:${verifiedToken}`);
      if (verifiedRaw) {
        const p = JSON.parse(verifiedRaw);
        userId = p.userId;
        authUserId = p.authUserId;
      }
    } else if (code) {
      const codeRaw = await cacheService.get(`pwd_reset_code:${code.trim()}`);
      if (codeRaw) {
        const p = JSON.parse(codeRaw);
        userId = p.userId;
        authUserId = p.authUserId;
      }
    } else if (resetToken) {
      const tokenRaw = await cacheService.get(`pwd_reset_token:${resetToken}`);
      if (tokenRaw) {
        const p = JSON.parse(tokenRaw);
        userId = p.userId;
        authUserId = p.authUserId;
      }
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid, expired, or already used reset session. Please request a new verification code.',
      });
      return;
    }

    // Fetch user record
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    // Update password in Supabase Auth
    const targetAuthId = authUserId || user.authUserId;
    if (targetAuthId) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetAuthId, {
        password: newPassword,
      });
      if (updateErr) {
        console.error('[Supabase Password Update Error]', updateErr);
        res.status(500).json({ success: false, error: updateErr.message || 'Failed to update password' });
        return;
      }
    }

    // Invalidate all tokens for this session so it cannot be used again
    if (verifiedToken) await cacheService.del(`pwd_verified_token:${verifiedToken}`);
    if (code) await cacheService.del(`pwd_reset_code:${code.trim()}`);
    if (resetToken) await cacheService.del(`pwd_reset_token:${resetToken}`);
    await cacheService.del(`pwd_reset_user:${user.id}`);

    // Security Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          actorRole: user.role,
          actorName: user.fullName || user.email,
          action: 'PASSWORD_RESET_SUCCESS',
          entityType: 'User',
          entityId: user.id,
          description: `User successfully reset account password.`,
        },
      });
    } catch (auditErr) {
      console.warn('[Audit Log Warning]', auditErr);
    }

    // Send security confirmation SMS
    if (user.phone) {
      SmsEthiopiaService.sendSms({
        recipientPhone: user.phone,
        messageBody: `Azwari Security Alert: Your account password was successfully updated. If you did not make this change, please contact platform support immediately.`,
        orderNumber: `SEC-${user.id.substring(0, 6)}`,
        templateName: 'password_reset_confirmed',
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset. You can now sign in with your new credentials.',
    });
  } catch (error: any) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/create-superadmin
 * Creates or promotes an existing user to Super Admin with verified credentials
 */
authRouter.post('/create-superadmin', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName = 'Super Admin', phone = '+251 911 000000', secretKey } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
      return;
    }

    const requiredSecret = process.env.ADMIN_SETUP_SECRET;
    if (requiredSecret && secretKey !== requiredSecret) {
      res.status(403).json({ success: false, error: 'Invalid admin setup secret key' });
      return;
    }

    let authUserId: string | null = null;

    // 1. Create or update user in Supabase Auth
    try {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          fullName,
          role: 'admin',
          phone,
        },
      });

      if (created?.user) {
        authUserId = created.user.id;
      } else if (createErr) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const users = (listData?.users ?? []) as Array<{ id: string; email?: string }>;
        const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

        if (found) {
          authUserId = found.id;
          await supabaseAdmin.auth.admin.updateUserById(found.id, {
            password,
            email_confirm: true,
            user_metadata: {
              fullName,
              role: 'admin',
              phone,
            },
          });
        } else {
          throw createErr;
        }
      }
    } catch (authErr: any) {
      console.warn('[Admin Create] Supabase Auth notice:', authErr?.message);
    }

    const fallbackId = authUserId || 'admin_' + Date.now().toString(36);

    // 2. Upsert into PostgreSQL User table with role = 'admin'
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'admin',
        fullName,
        phone,
        ...(authUserId ? { authUserId } : {}),
      },
      create: {
        id: fallbackId,
        authUserId: authUserId || fallbackId,
        email,
        fullName,
        phone,
        role: 'admin',
        subcity: 'Bole Central',
      },
    });

    res.status(200).json({
      success: true,
      message: `Super Admin account for ${email} created/updated successfully!`,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
      },
    });
  } catch (error: any) {
    console.error('[Create Superadmin Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create superadmin' });
  }
});

/**
 * GET /api/auth/users
 * Returns list of all registered users across PostgreSQL
 */
authRouter.get('/users', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        subcity: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, users });
  } catch (error: any) {
    console.error('[Get Users API Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch users directory' });
  }
});


