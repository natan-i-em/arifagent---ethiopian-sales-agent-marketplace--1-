import { Request, Response, NextFunction } from 'express';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  carrier: 'Ethio Telecom' | 'Safaricom Ethiopia' | 'Unknown';
}

/**
 * Normalizes and validates Ethiopian phone numbers
 * Accepts formats:
 * - "+251 91 122 3344", "+251911223344", "0911223344", "911223344" (Ethio Telecom)
 * - "+251 71 122 3344", "+251711223344", "0711223344", "711223344" (Safaricom Ethiopia)
 * Output standard: "2519XXXXXXXX" or "2517XXXXXXXX"
 */
export function normalizeEthiopianPhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: '', carrier: 'Unknown' };
  }

  // Remove whitespace, dashes, parens, plus sign
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

  let normalized = cleaned;
  if (normalized.startsWith('09') && normalized.length === 10) {
    normalized = '251' + normalized.substring(1);
  } else if (normalized.startsWith('07') && normalized.length === 10) {
    normalized = '251' + normalized.substring(1);
  } else if ((normalized.startsWith('9') || normalized.startsWith('7')) && normalized.length === 9) {
    normalized = '251' + normalized;
  }

  const isEthioTelecom = /^2519\d{8}$/.test(normalized);
  const isSafaricom = /^2517\d{8}$/.test(normalized);

  if (isEthioTelecom) {
    return { isValid: true, normalized, carrier: 'Ethio Telecom' };
  }
  if (isSafaricom) {
    return { isValid: true, normalized, carrier: 'Safaricom Ethiopia' };
  }

  return { isValid: false, normalized, carrier: 'Unknown' };
}

/**
 * Middleware: Validates incoming SMS payload
 */
export const validateSmsRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { recipientPhone, messageBody } = req.body;

  if (!recipientPhone) {
    res.status(400).json({ success: false, error: 'recipientPhone is required' });
    return;
  }

  const phoneResult = normalizeEthiopianPhone(recipientPhone);
  if (!phoneResult.isValid) {
    res.status(400).json({
      success: false,
      error: `Invalid Ethiopian phone number '${recipientPhone}'. Must be valid Ethio Telecom (09...) or Safaricom (07...) number.`,
    });
    return;
  }

  if (!messageBody || typeof messageBody !== 'string' || messageBody.trim().length === 0) {
    res.status(400).json({ success: false, error: 'messageBody must be a non-empty string' });
    return;
  }

  if (messageBody.length > 600) {
    res.status(400).json({ success: false, error: 'messageBody exceeds maximum 600 characters limit' });
    return;
  }

  // Attach normalized phone to request body for downstream handlers
  req.body.normalizedPhone = phoneResult.normalized;
  req.body.carrier = phoneResult.carrier;
  next();
};

/**
 * Middleware: Validates supplier registration fields
 */
export const validateSupplierRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { businessName, email, phone, subcity } = req.body;

  if (!businessName || !businessName.trim()) {
    res.status(400).json({ success: false, error: 'businessName is required' });
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, error: 'A valid email address is required' });
    return;
  }
  if (!phone) {
    res.status(400).json({ success: false, error: 'phone number is required' });
    return;
  }

  const phoneResult = normalizeEthiopianPhone(phone);
  if (!phoneResult.isValid) {
    res.status(400).json({ success: false, error: 'Valid Ethiopian mobile number required (09... or 07...)' });
    return;
  }

  if (!subcity) {
    res.status(400).json({ success: false, error: 'subcity is required' });
    return;
  }

  req.body.normalizedPhone = phoneResult.normalized;
  next();
};

/**
 * Middleware: Validates sales agent registration fields
 */
export const validateAgentRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { fullName, email, phone, subcity } = req.body;

  if (!fullName || !fullName.trim()) {
    res.status(400).json({ success: false, error: 'fullName is required' });
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, error: 'A valid email address is required' });
    return;
  }
  if (!phone) {
    res.status(400).json({ success: false, error: 'phone number is required' });
    return;
  }

  const phoneResult = normalizeEthiopianPhone(phone);
  if (!phoneResult.isValid) {
    res.status(400).json({ success: false, error: 'Valid Ethiopian mobile number required (09... or 07...)' });
    return;
  }

  if (!subcity) {
    res.status(400).json({ success: false, error: 'subcity is required' });
    return;
  }

  req.body.normalizedPhone = phoneResult.normalized;
  next();
};
