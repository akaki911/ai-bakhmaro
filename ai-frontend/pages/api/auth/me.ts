
<old_str>import type { NextApiRequest, NextApiResponse } from 'next';

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
}</old_str>
<new_str>import type { NextApiRequest, NextApiResponse } from 'next';

type SuccessResponse = {
  success: true;
  authenticated: true;
  user: {
    id: string;
    email: string;
    role: string;
    personalId: string;
    displayName: string;
  };
};

type ErrorResponse = {
  success: false;
  authenticated: false;
  error: string;
  code: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, authenticated: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Check if dev mode session was initialized
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // In development, check if backend dev session exists
      const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:5002';
      
      try {
        const response = await fetch(`${backendUrl}/api/mail/dev/session-status`, {
          method: 'GET',
          headers: {
            'Cookie': req.headers.cookie || '',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.authenticated && data.user) {
            console.log('✅ [General Auth] Dev session authenticated:', data.user.email);
            return res.status(200).json({
              success: true,
              authenticated: true,
              user: {
                id: data.user.userId || '01019062020',
                email: data.user.email || 'admin@bakhmaro.co',
                role: data.user.role || 'SUPER_ADMIN',
                personalId: data.user.personalId || '01019062020',
                displayName: data.user.displayName || 'სუპერ ადმინისტრატორი'
              }
            });
          }
        }
      } catch (backendError) {
        console.warn('⚠️ [General Auth] Backend check failed:', backendError);
      }
    }

    console.log('ℹ️ [General Auth] No active session found');
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
}</new_str>
