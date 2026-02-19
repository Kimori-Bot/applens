import { NextResponse } from 'next/server';

// Generate JWT-like token (simplified for demo)
export function generateToken(company) {
  const payload = {
    id: company.id,
    name: company.name,
    email: company.email,
    apiKey: company.api_key,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify token
export function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Auth middleware
export async function authenticateToken(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return { error: 'No token provided', status: 401 };
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    return { error: 'Invalid or expired token', status: 401 };
  }
  
  return { company: payload, error: null };
}

// Get authenticated user from request
export function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value;
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}
