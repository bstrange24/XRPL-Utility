import accountlib from 'xrpl-accountlib';

export default async function handler(req: any, res: any) {
     if (req.method !== 'GET') {
          return res.status(405).json({ error: 'Method not allowed' });
     }

     try {
          const mnemonic = req.query.mnemonic as string;
          const algorithm = req.query.algorithm as string | undefined;

          const account = accountlib.derive.mnemonic(mnemonic);

          return res.status(200).json(account);
     } catch (err: any) {
          return res.status(500).json({ error: err.message });
     }
}
