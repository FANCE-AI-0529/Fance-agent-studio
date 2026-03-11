import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { generateApiKey } from '../../../src/utils/apiKeyManagement.ts';

// This is a simple example; in production you should implement proper auth & storage
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { oldKey } = req.body as { oldKey?: string };
  if (!oldKey) {
    return res.status(400).json({ error: 'oldKey missing' });
  }

  try {
    // initialize supabase or other DB if needed
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // mark old key as revoked in database (pseudo)
    await supabase
      .from('api_keys')
      .update({ revoked: true })
      .eq('key', oldKey);

    const newKey = generateApiKey();
    await supabase.from('api_keys').insert({ key: newKey, revoked: false });

    return res.status(200).json({ newKey });
  } catch (error: any) {
    console.error('rotate-api-key error', error);
    return res.status(500).json({ error: error.message });
  }
}
