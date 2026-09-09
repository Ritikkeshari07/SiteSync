import type { Identity } from '@/lib/access';
// Standalone public demo: visitor-supplied identity headers are never trusted.
export async function identity(): Promise<Identity | null> { return null; }
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  return !origin || origin === new URL(req.url).origin;
}
