import accountlib from 'xrpl-accountlib';
export const runtime = 'nodejs';

export default async function handler(req: any, res: any) {
     if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
     }

     try {
          const { environment, algorithm = 'ed25519' } = req.body;

          const wallet = accountlib.generate.familySeed({ algorithm });

          if (environment !== 'mainnet') {
               let faucet = 'https://faucet.devnet.rippletest.net/accounts';
               if (environment === 'testnet') {
                    faucet = 'https://faucet.altnet.rippletest.net/accounts';
               }

               const r = await fetch(faucet, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination: wallet.address }),
               });

               if (!r.ok) {
                    throw new Error(`Faucet failed: ${r.statusText}`);
               }
          }

          return res.status(200).json(wallet);
     } catch (err: any) {
          return res.status(500).json({ error: err.message });
     }
}
