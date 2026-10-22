import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'TON features are disabled' }, { status: 403 });
} 