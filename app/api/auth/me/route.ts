import { NextResponse } from 'next/server';
import { verifySession, isSetupCompleted } from '@/lib/auth';

export async function GET() {
  const setupDone = await isSetupCompleted();
  if (!setupDone) {
    return NextResponse.json({ authenticated: false, needsSetup: true });
  }

  const session = await verifySession();
  return NextResponse.json({
    authenticated: session.authenticated,
    username: session.username,
    needsSetup: false,
  });
}
