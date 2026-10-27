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

/**
 * Validates Supabase JWT from Authorization: Bearer <token>
 * Populates req.user from DB with verified role and entity ID
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required. Missing or malformed Authorization header.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({ success: false, error: 'Empty bearer authentication token.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ success: false, error: 'Invalid or expired authentication session.' });
      return;
    }

    const authUser = data.user;

    // Retrieve database profile record
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { authUserId: authUser.id },
          ...(authUser.email ? [{ email: authUser.email }] : []),
        ],
      },
    });

    if (!dbUser) {
      // Auto-provision user record if authenticated via Supabase
      const metadata = authUser.user_metadata || {};
      const fallbackRole = (metadata.role as any) || 'salesperson';
      dbUser = await prisma.user.create({
        data: {
          id: authUser.id,
          authUserId: authUser.id,
          email: authUser.email || `${authUser.id}@azwari.et`,
          fullName: metadata.fullName || metadata.name || authUser.email?.split('@')[0] || 'User',
          role: fallbackRole,
          phone: metadata.phone || null,
          subcity: metadata.subcity || 'Bole',
        },
      });
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
      authUserId: authUser.id,
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
 * Optional authentication - extracts user if valid bearer token present, but does not block if omitted
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token) return next();

  try {
    const { data } = await supabaseAdmin.auth.getUser(token);
    if (!data?.user) return next();

    const authUser = data.user;
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ authUserId: authUser.id }, ...(authUser.email ? [{ email: authUser.email }] : [])],
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
          where: { OR: [{ authUserId: dbUser.authUserId! }, { email: dbUser.email }] },
          select: { id: true },
        });
        salesPartnerId = sp?.id;
      }

      req.user = {
        id: dbUser.id,
        authUserId: authUser.id,
        email: dbUser.email,
        role: dbUser.role as any,
        name: dbUser.fullName || dbUser.email.split('@')[0],
        fullName: dbUser.fullName || dbUser.email.split('@')[0],
        phone: dbUser.phone || undefined,
        businessId,
        salesPartnerId,
      };
    }
  } catch (e) {
    // Silently continue for optional auth
  }

  next();
}
