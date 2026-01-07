import accountlib from 'xrpl-accountlib';

export default async function handler(req: any, res: any) {
     if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed, use POST' });
     }

     try {
          const { secretNumbers, algorithm = 'ed25519' } = req.body;

          if (!secretNumbers || !Array.isArray(secretNumbers)) {
               return res.status(400).json({ error: 'secretNumbers must be a non-empty array' });
          }

          // Optional: validate length (usually 8 numbers for XRPL secret numbers)
          if (secretNumbers.length !== 8) {
               return res.status(400).json({ error: 'secretNumbers must contain exactly 8 numbers' });
          }

          const account = accountlib.derive.secretNumbers(secretNumbers, algorithm);

          return res.status(200).json(account);
     } catch (err: any) {
          console.error('Derivation error:', err);
          return res.status(500).json({ error: err.message || 'Internal server error' });
     }
}
