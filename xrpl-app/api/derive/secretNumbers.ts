import accountlib from 'xrpl-accountlib';

export default async function handler(req: any, res: any) {
     if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed, use POST' });
     }

     console.log('Received body:', req.body); // Add this for Vercel logs

     try {
          const { secretNumbers, algorithm = 'ed25519' } = req.body || {};

          if (!secretNumbers) {
               return res.status(400).json({ error: 'Missing secretNumbers in body' });
          }

          if (!Array.isArray(secretNumbers) || secretNumbers.length !== 8) {
               return res.status(400).json({
                    error: 'secretNumbers must be an array of exactly 8 strings (6 digits each)',
               });
          }

          // Ensure they are strings
          const secretNumsStr = secretNumbers.map(String);

          const account = accountlib.derive.secretNumbers(secretNumsStr, algorithm);

          return res.status(200).json(account);
     } catch (err: any) {
          console.error('Error:', err);
          return res.status(500).json({ error: err.message || 'Derivation failed' });
     }
}
