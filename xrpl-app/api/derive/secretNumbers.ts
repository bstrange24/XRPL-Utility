import accountlib from 'xrpl-accountlib';

export default async function handler(req: any, res: any) {
     if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
     }

     try {
          const { secretNumbers, algorithm } = req.body;

          if (!Array.isArray(secretNumbers)) {
               return res.status(400).json({ error: 'secretNumbers must be an array' });
          }

          const account = accountlib.derive.secretNumbers(secretNumbers);

          return res.status(200).json(account);
     } catch (err: any) {
          return res.status(500).json({ error: err.message });
     }
}
