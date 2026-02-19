import { NextResponse } from 'next/server';
import { authenticateToken } from '@/lib/auth';
import { query } from '@/lib/supabase';

// GET /api/companies/:id
export async function GET(request, { params }) {
  const resolvedParams = await params;
  const companyId = resolvedParams.id;
  
  const auth = await authenticateToken(request);
  
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (String(companyId) !== String(auth.company.id)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const { data: company } = await query('companies', { 
      where: { id: parseInt(companyId) }
    });

    if (!company || company.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { api_key, ...safeCompany } = company[0];
    return NextResponse.json(safeCompany);
  } catch (error) {
    console.error('Get company error:', error);
    return NextResponse.json({ error: 'Failed to get company' }, { status: 500 });
  }
}
