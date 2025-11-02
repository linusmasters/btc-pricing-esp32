import { NextResponse } from 'next/server';
import { getLatestTicks, getTodayTicks, getDailyStats } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'latest';

    if (type === 'today') {
      const ticks = await getTodayTicks();
      return NextResponse.json({ ticks });
    }

    if (type === 'stats') {
      const stats = await getDailyStats();
      return NextResponse.json({ stats });
    }

    // Default: latest ticks
    const limit = parseInt(searchParams.get('limit') || '10');
    const ticks = await getLatestTicks(limit);
    return NextResponse.json({ ticks });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from database' },
      { status: 500 }
    );
  }
}
