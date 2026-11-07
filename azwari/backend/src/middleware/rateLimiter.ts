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

// Account Signup Limiter: Max 5 registration attempts per 15 minutes per IP
// Prevents bot account generation and registration spamming
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many account registration attempts. For security, please wait 15 minutes before trying again.',
  },
});

// Login Limiter: Max 10 login attempts per 15 minutes per IP
// Prevents password brute-forcing and credential stuffing attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Your IP has been temporarily throttled for 15 minutes to protect user accounts.',
  },
});

// Forgot Password Request Limiter: Max 3 requests per 15 minutes per IP
// Prevents OTP SMS exhaustion, email bombing, and enumeration
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many password reset requests. Please wait 15 minutes before requesting another reset code.',
  },
});

// Reset Password Execution Limiter: Max 5 attempts per 15 minutes per IP
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many password reset attempts. Please wait 15 minutes before trying again.',
  },
});

// General Auth Limiter: Backwards compatibility
export const authLimiter = signupLimiter;

// Order Creation Limiter: Max 30 orders per 10 minutes per IP
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
