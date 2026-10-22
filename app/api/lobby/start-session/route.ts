import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await prisma.gameSession.create({
      data: {
        status: 'waiting'
      }
    });
    
    // انتشار رویداد در ردیس
    await redis.publish('lobby-events', JSON.stringify({
      type: 'session-start',
      sessionId: session.id,
      status: 'waiting'
    }));
    
    return NextResponse.json({ 
      success: true, 
      sessionId: session.id 
    });
    
  } catch (error) {
    console.error('Start session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 