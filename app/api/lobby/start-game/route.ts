import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    
    // به‌روزرسانی وضعیت سشن
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'starting',
        startTime: new Date()
      }
    });

    // انتشار رویداد در ردیس
    await redis.publish('lobby-events', JSON.stringify({
      type: 'game-start',
      sessionId,
      status: 'starting'
    }));
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 