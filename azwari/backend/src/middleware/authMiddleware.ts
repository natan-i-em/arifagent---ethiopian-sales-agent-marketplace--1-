import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { prisma } from '../prisma.js';

export interface AuthenticatedUser {
  id: string;
  authUserId: string;
  email: string;
  role: 'salesperson' | 'supplier' | 'admin';
  name: string;
  fullName: string;
  phone?: string;
  businessId?: string;
  salesPartnerId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export type AuthenticatedRequest = Request;

const AUTH_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  'azwari-ethiopian-marketplace-auth-secret-key-2025';

export interface TokenPayload {
  userId: string;
  authUserId?: string;
  email: string;
  role: 'salesperson' | 'supplier' | 'admin';
  exp?: number;
}

/**
 * Creates a tamper-proof HMAC-SHA256 signed session token for verified users
 */
export function signToken(payload: TokenPayload): string {
  const data = JSON.stringify({
    ...payload,
    exp: payload.exp || Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days default
  });
  const dataB64 = Buffer.from(data).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(dataB64).digest('base64url');
  return `azw_${dataB64}.${sig}`;
}

/**
 * Validates and decodes a tamper-proof signed Azwari token
 */
export function verifySignedToken(token: string): TokenPayload | null {
  if (!token || !token.startsWith('azw_')) return null;
  const raw = token.substring(4);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [dataB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(dataB64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return parsed as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts bearer, session, or tracking tokens from request headers or query params
 */
export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const t = authHeader.substring(7).trim();
    if (t) return t;
  }
  const customSession = (req.headers['x-session-token'] || req.headers['x-azwari-token']) as string | undefined;
  if (customSession && customSession.trim()) {
    return customSession.trim();
  }
  const queryToken = req.query.token as string | undefined;
  if (queryToken && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}

/**
 * Validates either a Supabase JWT or an Azwari signed session token from Authorization: Bearer <token>
 * Populates req.user from DB with verified role and entity ID
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractTokenFromRequest(req);
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed Authorization header.',
    });
    return;
  }

  try {
    let authUserId: string | null = null;
    let authUserEmail: string | null = null;
    let tokenRole: string | null = null;
    let directUserId: string | null = null;

    // 1. Verify signed Azwari HMAC token
    const verifiedAzw = verifySignedToken(token);
    if (verifiedAzw) {
      directUserId = verifiedAzw.userId;
      authUserEmail = verifiedAzw.email;
      authUserId = verifiedAzw.authUserId || verifiedAzw.userId;
      tokenRole = verifiedAzw.role;
    } else {
      // 2. Validate Supabase JWT token
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired authentication session. Please sign in again.',
        });
        return;
      }
      authUserId = data.user.id;
      authUserEmail = data.user.email || null;
    }

    // 3. Retrieve database profile record
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(directUserId ? [{ id: directUserId }] : []),
          ...(authUserId ? [{ authUserId }] : []),
          ...(authUserEmail ? [{ email: authUserEmail }] : []),
        ],
      },
    });

    if (!dbUser && authUserId) {
      // Auto-provision user record if authenticated via Supabase
      dbUser = await prisma.user.create({
        data: {
          id: authUserId,
          authUserId: authUserId,
          email: authUserEmail || `${authUserId}@azwari.et`,
          fullName: authUserEmail?.split('@')[0] || 'User',
          role: (tokenRole as any) || 'salesperson',
          phone: null,
          subcity: 'Bole',
        },
      });
    }

    if (!dbUser) {
      res.status(401).json({ success: false, error: 'User profile not found for authenticated token.' });
      return;
    }

    // Determine linked entity (Business for supplier, SalesPartner for salesperson)
    let businessId: string | undefined;
    let salesPartnerId: string | undefined;

    if (dbUser.role === 'supplier') {
      const biz = await prisma.business.findFirst({
        where: {
          OR: [
            ...(dbUser.authUserId ? [{ authUserId: dbUser.authUserId }] : []),
            { contactEmail: dbUser.email },
          ],
        },
        select: { id: true },
      });
      businessId = biz?.id;
    } else if (dbUser.role === 'salesperson') {
      const sp = await prisma.salesPartner.findFirst({
        where: {
          OR: [
            ...(dbUser.authUserId ? [{ authUserId: dbUser.authUserId }] : []),
            ...(dbUser.email ? [{ email: dbUser.email }] : []),
            ...(dbUser.phone ? [{ phone: dbUser.phone }] : []),
          ],
        },
        select: { id: true },
      });
      salesPartnerId = sp?.id;
    }

    req.user = {
      id: dbUser.id,
      authUserId: dbUser.authUserId || dbUser.id,
      email: dbUser.email,
      role: (dbUser.role as any) || 'salesperson',
      name: dbUser.fullName || dbUser.email.split('@')[0],
      fullName: dbUser.fullName || dbUser.email.split('@')[0],
      phone: dbUser.phone || undefined,
      businessId,
      salesPartnerId,
    };

    next();
  } catch (err: any) {
    console.error('[AuthMiddleware Error]', err);
    res.status(500).json({ success: false, error: 'Internal server error validating authentication session.' });
  }
}

/**
 * Restricts endpoint to specified roles
 */
export function requireRole(...allowedRoles: Array<'salesperson' | 'supplier' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access Denied: This operation requires one of the following roles: [${allowedRoles.join(', ')}]. You are signed in as '${req.user.role}'.`,
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - extracts user if valid bearer or session token present, but does not block if omitted
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractTokenFromRequest(req);
  if (!token) return next();

  try {
    let authUserId: string | null = null;
    let authUserEmail: string | null = null;
    let directUserId: string | null = null;

    const verifiedAzw = verifySignedToken(token);
    if (verifiedAzw) {
      directUserId = verifiedAzw.userId;
      authUserEmail = verifiedAzw.email;
      authUserId = verifiedAzw.authUserId || verifiedAzw.userId;
    } else {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        authUserId = data.user.id;
        authUserEmail = data.user.email || null;
      }
    }

    if (authUserId || authUserEmail || directUserId) {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(directUserId ? [{ id: directUserId }] : []),
            ...(authUserId ? [{ authUserId }] : []),
            ...(authUserEmail ? [{ email: authUserEmail }] : []),
          ],
        },
      });

      if (dbUser) {
        let businessId: string | undefined;
        let salesPartnerId: string | undefined;

        if (dbUser.role === 'supplier') {
          const b = await prisma.business.findFirst({
            where: { OR: [{ authUserId: dbUser.authUserId! }, { contactEmail: dbUser.email }] },
            select: { id: true },
          });
          businessId = b?.id;
        } else if (dbUser.role === 'salesperson') {
          const sp = await prisma.salesPartner.findFirst({
            where: {
              OR: [
                ...(dbUser.authUserId ? [{ authUserId: dbUser.authUserId }] : []),
                ...(dbUser.email ? [{ email: dbUser.email }] : []),
                ...(dbUser.phone ? [{ phone: dbUser.phone }] : []),
              ],
            },
            select: { id: true },
          });
          salesPartnerId = sp?.id;
        }

        req.user = {
          id: dbUser.id,
          authUserId: dbUser.authUserId || dbUser.id,
          email: dbUser.email,
          role: dbUser.role as any,
          name: dbUser.fullName || dbUser.email.split('@')[0],
          fullName: dbUser.fullName || dbUser.email.split('@')[0],
          phone: dbUser.phone || undefined,
          businessId,
          salesPartnerId,
        };
      }
    }
  } catch (e) {
    // Silently continue for optional auth
  }

  next();
}
