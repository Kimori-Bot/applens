import { NextResponse } from 'next/server';
import { insert, query } from '@/lib/supabase';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// POST /api/auth/register
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existing = await query('companies', { where: { email } });
    if (existing.data && existing.data.length > 0) {
      return NextResponse.json(
        { error: 'Company with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate API key
    const apiKey = 'apl_' + crypto.randomBytes(16).toString('hex');

    // Insert company
    const result = await insert('companies', {
      name,
      email,
      password_hash: passwordHash,
      api_key: apiKey,
    });

    const company = result[0];

    // Generate JWT
    const token = generateToken(company);

    const response = NextResponse.json({
      message: 'Company registered successfully',
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        apiKey: company.api_key,
      },
      token,
    }, { status: 201 });

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
