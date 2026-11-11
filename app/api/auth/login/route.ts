import { NextRequest } from 'next/server';
import { beginAuth } from '@/lib/auth-http';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) { return beginAuth(req, false); }
