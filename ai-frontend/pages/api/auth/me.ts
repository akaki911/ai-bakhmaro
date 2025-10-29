import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: false; authenticated: false; error: string; code: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, authenticated: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    console.log('ℹ️ [General Auth] Legacy /api/auth/me endpoint invoked without support.');
    return res.status(401).json({ success: false, authenticated: false, error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
  } catch (error) {
    console.error('❌ [General Auth] Internal error:', error);
    return res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}
