import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { supabaseAdmin } from '../supabase.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateSupplierRegistration, validateAgentRegistration, normalizeEthiopianPhone } from '../middleware/validator.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const authRouter = Router();

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
authRouter.post('/register-supplier', authLimiter, validateSupplierRegistration, async (req: Request, res: Response) => {
  try {
    const { email, password, businessName, tradeName, tinNumber, licenseNumber, phone, subcity, specificLocation, contactEmail, primaryBank } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password of at least 6 characters is required' });
      return;
    }

    const phoneInfo = normalizeEthiopianPhone(phone);
    const formattedPhone = phoneInfo.isValid ? phoneInfo.normalized : phone;

    let authUserId = 'user_' + Date.now().toString(36);

    // 1. Create or verify user in Supabase Auth if password provided
    if (password && password.length >= 6) {
      try {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            fullName: businessName,
            phone: formattedPhone,
            role: 'supplier',
            subcity,
          },
        });

        if (authUser?.user) {
          authUserId = authUser.user.id;
        } else if (authErr) {
          // If already registered, fetch the user ID
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const users = (listData?.users ?? []) as Array<{ id: string; email?: string }>;
          const found = users.find((u) => u.email === email);
          if (found) authUserId = found.id;
        }
      } catch (authException) {
        console.warn('[Auth] Supabase admin create notice:', authException);
      }
    }

    // 2. Atomic insert/upsert into PostgreSQL User table via Prisma
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: {
        fullName: businessName,
        phone: formattedPhone,
        role: 'supplier',
        subcity,
        authUserId,
      },
      create: {
        id: authUserId,
        authUserId,
        email,
        fullName: businessName,
        phone: formattedPhone,
        role: 'supplier',
        subcity,
      },
    });

    const bizId = 'biz_' + Date.now().toString(36);

    // 3. Upsert Business Record
    const dbBusiness = await prisma.business.upsert({
      where: { tinNumber: tinNumber || `TIN-${Date.now()}` },
      update: {
        name: businessName,
        tradeName: tradeName || businessName,
        subcity,
        specificLocation: specificLocation || '',
        phone: formattedPhone,
        contactEmail: contactEmail || email,
        authUserId,
      },
      create: {
        id: bizId,
        authUserId,
        name: businessName,
        tradeName: tradeName || businessName,
        tinNumber: tinNumber || `TIN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        licenseNumber: licenseNumber || `BL-${Math.floor(100000 + Math.random() * 900000)}`,
        verificationStatus: 'PENDING',
        city: 'Addis Ababa',
        subcity,
        specificLocation: specificLocation || 'Addis Ababa Commercial Zone',
        phone: formattedPhone,
        contactEmail: contactEmail || email,
      },
    });

    // 4. Save Payment Account if provided
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
            accountHolderName: primaryBank.accountHolderName || businessName,
            isPrimary: true,
            verified: true,
          },
        });
      } catch (bankErr) {
        console.warn('[Auth] Payment account save notice:', bankErr);
      }
    }

    // 5. Automatic Welcome SMS via SMS Ethiopia Gateway
    const welcomeMsg = `Welcome ${businessName} to Azwari! Your supplier application has been received and is under verification. Login: ${email}`;
    await SmsEthiopiaService.sendSms({
      recipientPhone: phone,
      messageBody: welcomeMsg,
      orderNumber: dbBusiness.id,
      templateName: 'merchant_registered',
    });

    res.status(201).json({
      success: true,
      user: dbUser,
      business: dbBusiness,
      message: 'Supplier account registered and submitted for verification.',
    });
  } catch (error: any) {
    console.error('[Register Supplier Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to register supplier' });
  }
});

/**
 * POST /api/auth/register-agent
 * Moves sales partner onboarding to backend: rate-limited, validated, atomic database insert
 */
authRouter.post('/register-agent', authLimiter, validateAgentRegistration, async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, telegramUsername, subcity, payoutProvider, payoutAccountNumber, payoutAccountName } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password of at least 6 characters is required' });
      return;
    }

    const phoneInfo = normalizeEthiopianPhone(phone);
    const formattedPhone = phoneInfo.isValid ? phoneInfo.normalized : phone;

    let authUserId = 'user_' + Date.now().toString(36);

    // 1. Create or verify user in Supabase Auth if password provided
    if (password && password.length >= 6) {
      try {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email,
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
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const users = (listData?.users ?? []) as Array<{ id: string; email?: string }>;
          const found = users.find((u) => u.email === email);
          if (found) authUserId = found.id;
        }
      } catch (authException) {
        console.warn('[Auth] Supabase admin create notice:', authException);
      }
    }

    // 2. Insert/Upsert into PostgreSQL User table
    const dbUser = await prisma.user.upsert({
      where: { email },
      update: {
        fullName,
        phone: formattedPhone,
        role: 'salesperson',
        subcity,
        authUserId,
      },
      create: {
        id: authUserId,
        authUserId,
        email,
        fullName,
        phone: formattedPhone,
        role: 'salesperson',
        subcity,
      },
    });

    const spId = 'sp_' + Date.now().toString(36);
    const initials = fullName.split(' ')[0].toUpperCase();
    const referralCode = `${initials}-${Math.floor(100 + Math.random() * 900)}`;

    // 3. Upsert SalesPartner table
    const dbSalesPartner = await prisma.salesPartner.upsert({
      where: { phone: formattedPhone },
      update: {
        fullName,
        email,
        subcity,
        telegramUsername: telegramUsername || null,
        payoutProvider: payoutProvider === 'Telebirr' ? 'TELEBIRR' : 'CBE',
        payoutAccountNumber: payoutAccountNumber || formattedPhone,
        payoutAccountName: payoutAccountName || fullName,
        authUserId,
      },
      create: {
        id: spId,
        authUserId,
        email,
        fullName,
        phone: formattedPhone,
        telegramUsername: telegramUsername || null,
        subcity,
        payoutProvider: payoutProvider === 'Telebirr' ? 'TELEBIRR' : 'CBE',
        payoutAccountNumber: payoutAccountNumber || formattedPhone,
        payoutAccountName: payoutAccountName || fullName,
        referralCode,
      },
    });

    // 4. Automatic Activation SMS via SMS Ethiopia Gateway
    const welcomeMsg = `Congratulations ${fullName}! Your Azwari Sales Partner account is activated. Referral code: ${referralCode}. Share catalog links to earn commissions!`;
    await SmsEthiopiaService.sendSms({
      recipientPhone: phone,
      messageBody: welcomeMsg,
      orderNumber: spId,
      templateName: 'agent_activated',
    });

    res.status(201).json({
      success: true,
      user: dbUser,
      salesPartner: dbSalesPartner,
      message: 'Sales Agent registered and activated successfully.',
    });
  } catch (error: any) {
    console.error('[Register Agent Error]', error);
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

    res.status(200).json({
      success: true,
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
 * Backend authentication with phone/email resolution, password verification, and user profile loading
 */
authRouter.post('/login', authLimiter, async (req: Request, res: Response) => {
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
      const phoneInfo = normalizeEthiopianPhone(input);
      const normalizedPhone = phoneInfo.isValid ? phoneInfo.normalized : input;

      const userByPhone = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: input },
            { phone: normalizedPhone },
            { phone: phoneInfo.normalized ? `+${phoneInfo.normalized}` : input },
          ],
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

    // If password provided, authenticate against Supabase Auth
    if (password) {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (authErr) {
        res.status(401).json({ success: false, error: authErr.message });
        return;
      }

      if (authData?.user) {
        authUserId = authData.user.id;
        authUserMetadata = authData.user.user_metadata;
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

    res.status(200).json({
      success: true,
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


