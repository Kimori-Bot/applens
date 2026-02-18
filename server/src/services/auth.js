/**
 * AppLens Auth Service
 * Multi-tenant authentication with JWT tokens and API keys
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://ndvfvjrkupudouolbtuc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdmZ2anJrdXB1ZG91b2xidHVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzA4NTEsImV4cCI6MjA4NzAwNjg1MX0.wZb_QL8Htk0OKrYAKpbM-0cdUnPhOF06qwg5bdKEioY';
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT Secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'applens-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Password hashing
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Password verification
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(companyId) {
  return jwt.sign(
    { companyId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Generate unique API key
function generateApiKey() {
  const prefix = 'apl_';
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + key;
}

// Register new company
async function register(name, email, password) {
  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate API key
    const apiKey = generateApiKey();

    // Create company
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        api_key: apiKey,
        plan: 'free'
      })
      .select()
      .single();

    if (error) throw error;

    // Generate JWT token
    const token = generateToken(data.id);

    return {
      company: {
        id: data.id,
        name: data.name,
        email: data.email,
        plan: data.plan,
        apiKey: data.api_key,
        createdAt: data.created_at
      },
      token
    };
  } catch (error) {
    throw error;
  }
}

// Login company
async function login(email, password) {
  try {
    // Find company by email
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const validPassword = await verifyPassword(password, data.password_hash);
    if (!validPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(data.id);

    return {
      company: {
        id: data.id,
        name: data.name,
        email: data.email,
        plan: data.plan,
        apiKey: data.api_key,
        createdAt: data.created_at
      },
      token
    };
  } catch (error) {
    throw error;
  }
}

// Get company by ID
async function getCompanyById(companyId) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, email, plan, api_key, created_at')
      .eq('id', companyId)
      .single();

    if (error || !data) {
      throw new Error('Company not found');
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      plan: data.plan,
      apiKey: data.api_key,
      createdAt: data.created_at
    };
  } catch (error) {
    throw error;
  }
}

// Generate new API key
async function regenerateApiKey(companyId) {
  try {
    const newApiKey = generateApiKey();

    const { data, error } = await supabase
      .from('companies')
      .update({ api_key: newApiKey })
      .eq('id', companyId)
      .select('id, name, email, plan, api_key, created_at')
      .single();

    if (error) throw error;

    return {
      company: {
        id: data.id,
        name: data.name,
        email: data.email,
        plan: data.plan,
        apiKey: data.api_key,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    throw error;
  }
}

// Verify token middleware for Express
function verifyTokenMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.companyId = decoded.companyId;
  next();
}

// Optional auth middleware (for public routes)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  
  if (decoded) {
    req.companyId = decoded.companyId;
  }
  
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateApiKey,
  register,
  login,
  getCompanyById,
  regenerateApiKey,
  verifyTokenMiddleware,
  optionalAuth,
  supabase
};
