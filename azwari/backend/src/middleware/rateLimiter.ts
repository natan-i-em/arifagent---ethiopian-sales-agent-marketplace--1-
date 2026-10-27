import rateLimit from 'express-rate-limit';

// General API Rate Limiter: Generous limit for real-time live synchronization (5000 requests per 15 minutes)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

// Strict SMS Dispatch Rate Limiter: Max 10 SMS per 10 minutes per IP
// Protects against SMS bombing, API key abuse, and gateway balance depletion
export const smsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'SMS rate limit exceeded. Maximum 10 messages per 10 minutes allowed.',
  },
});

// Auth Registration Limiter: Max 15 registration attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration attempts. Please wait before trying again.',
  },
});// Order Creation Limiter: Max 30 orders per 10 minutes per IP
export const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many orders created from this IP. Please wait before placing more orders.',
  },
});
