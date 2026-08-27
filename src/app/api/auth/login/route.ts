import { NextRequest, NextResponse } from 'next/server';
import { getUidMaster } from '@/lib/bigquery';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid || uid.trim() === '') {
      return NextResponse.json(
        { error: 'UID is required' },
        { status: 400 }
      );
    }

    const user = await getUidMaster(uid);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid UID' },
        { status: 401 }
      );
    }

    const token = generateToken(user.uid, user.company_name);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          uid: user.uid,
          company_name: user.company_name,
          total_branches: user.total_branches,
        },
      },
      { status: 200 }
    );

    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
