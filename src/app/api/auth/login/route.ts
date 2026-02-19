import { NextResponse } from 'next/server';
import { query } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// Generate token
function generateToken(company) {
  const payload = {
    id: company.id,
    name: company.name,
    email: company.email,
    apiKey: company.api_key,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// POST /api/auth/login
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find company
    const result = await query('companies', { where: { email } });
    
    if (!result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const company = result.data[0];

    // Verify password
    const isValid = await bcrypt.compare(password, company.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = generateToken(company);

    // Create response with cookie
    const response = NextResponse.json({
      message: 'Login successful',
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        apiKey: company.api_key,
      },
      token,
    });

    // Set cookie for middleware to detect
    response.cookies.set('token', token, {
      httpOnly: false, // Allow JS access for now
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
