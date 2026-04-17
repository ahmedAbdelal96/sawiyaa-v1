/**
 * Auth Refresh API Route
 * يتم استدعاؤه من api-client عند انتهاء صلاحية الـ Access Token
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  try {
    const success = await refreshAccessToken();
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to refresh token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('[API] Refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
