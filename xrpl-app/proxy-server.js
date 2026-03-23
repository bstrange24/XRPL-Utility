const express = require('express');
const axios = require('axios');
const cors = require('cors');
const accountlib = require('xrpl-accountlib');
const xrpl = require('xrpl');
const { Wallet } = require('xrpl');
const { execSync } = require('node:child_process');
const fs = require('node:fs');

const app = express();
app.use(cors());
app.use(express.json()); // allow JSON bodies

app.get('/api/xpmarket/token/:currencyIssuer', async (req, res) => {
     try {
          const [currency, issuer] = req.params.currencyIssuer.split('.');
          console.log(`currency ${currency} issuer ${issuer}`);
          const url = `https://api.xrpscan.com/api/v1/account/${issuer}`;
          const response = await axios.get(url);
          console.log('response', response.data.inception);
          res.json(response.data);
     } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to fetch from XPMarket' });
     }
});

// Create wallet from familySeed and fund it
app.post('/api/create-wallet/familySeed', async (req, res) => {
     try {
          const { environment, algorithm = 'ed25519' } = req.body;

          console.log(`Generating account from family seed`);
          console.log(`environment ${environment}, algorithm ${algorithm}`);

          const generatedWallet = accountlib.generate.familySeed({ algorithm: algorithm });
          console.log(`account ${JSON.stringify(generatedWallet, null, 2)}`);
          let faucet = 'https://faucet.devnet.rippletest.net/accounts';

          if (environment !== 'mainnet') {
               if (environment === 'testnet') {
                    faucet = 'https://faucet.altnet.rippletest.net/accounts';
               }

               const faucetResponse = await fetch(faucet, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination: generatedWallet.address }),
               });

               if (!faucetResponse.ok) {
                    throw new Error(`Faucet request failed: ${faucetResponse.statusText}`);
               }

               const faucetResult = await faucetResponse.json();
               console.log(`faucetResult ${JSON.stringify(faucetResult, null, 2)}`);
          }

          // For mainnet just return generated wallet without funding
          res.json(generatedWallet);
     } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to generate or fund account' });
     }
});

// Derive wallet created from a family seed
app.get('/api/derive/familySeed', async (req, res) => {
     try {
          const { familySeed, algorithm } = req.query;

          if (!familySeed) {
               return res.status(400).json({ error: 'Seed is required' });
          }

          const account = accountlib.derive.familySeed(familySeed, { algorithm });

          res.json(account);
     } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to derive account' });
     }
});

// Create wallet from mnemonic
app.post('/api/create-wallet/mnemonic', async (req, res) => {
     try {
          console.log(`req.body ${JSON.stringify(req.body, null, '\t')}`);
          const { environment, algorithm = 'ed25519' } = req.body;

          console.log(`Generating account from mnemonic`);
          console.log(`environment ${environment}, algorithm ${algorithm}`);

          const generatedWallet = accountlib.generate.mnemonic({ algorithm: algorithm });
          console.log(`account ${JSON.stringify(generatedWallet, null, 2)}`);

          let facet = 'https://faucet.devnet.rippletest.net/accounts';

          if (environment !== 'mainnet') {
               if (environment === 'testnet') {
                    facet = 'https://faucet.altnet.rippletest.net/accounts';
               }

               const faucetResponse = await fetch(facet, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination: generatedWallet.address }),
               });

               if (!faucetResponse.ok) {
                    throw new Error(`Faucet request failed: ${faucetResponse.statusText}`);
               }

               const faucetResult = await faucetResponse.json();
               console.log(`faucetResult ${JSON.stringify(faucetResult, null, '\t')}`);

               return res.json(generatedWallet);
          }

          // For mainnet just return generated wallet without funding
          return res.json(generatedWallet);
     } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to generate account from mnemonic' });
     }
});

// Get wallet created from a mnemonic
app.get('/api/derive/mnemonic', async (req, res) => {
     try {
          const { mnemonic, algorithm } = req.query;

          if (!mnemonic) {
               return res.status(400).json({ error: 'Mnemonic is required' });
          }
          console.log(JSON.stringify(mnemonic));

          const account = accountlib.derive.mnemonic(mnemonic, { algorithm });

          res.json(account);
     } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to derive account' });
     }
});

// Create wallet from secretNumbers
app.post('/api/create-wallet/secretNumbers', async (req, res) => {
     try {
          const { environment, algorithm = 'ed25519' } = req.body;

          console.log(`Generating account from secret numbers`);
          console.log(`environment ${environment}, algorithm ${algorithm}`);

          // Generate secretNumbers wallet
          const generatedWallet = accountlib.generate.secretNumbers({ algorithm: algorithm });
          console.log(`account ${JSON.stringify(generatedWallet, null, 2)}`);
          let facet = 'https://faucet.devnet.rippletest.net/accounts';

          if (environment !== 'mainnet') {
               if (environment === 'testnet') {
                    facet = 'https://faucet.altnet.rippletest.net/accounts';
               }

               // Fund via faucet
               const faucetResponse = await fetch(facet, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ destination: generatedWallet.address }),
               });

               if (!faucetResponse.ok) {
                    throw new Error(`Faucet request failed: ${faucetResponse.statusText}`);
               }

               const faucetResult = await faucetResponse.json();
               console.log(`faucetResult ${JSON.stringify(faucetResult, null, '\t')}`);

               return res.json(generatedWallet);
          }

          // For mainnet just return wallet, no faucet funding
          return res.json(generatedWallet);
     } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to generate account from secret numbers' });
     }
});

// Get wallet created from a secret numbers
app.post('/api/derive/secretNumbers', async (req, res) => {
     try {
          const { secretNumbers, algorithm } = req.body;

          console.log(`secretNumbers:`, secretNumbers, `algorithm: ${algorithm}`);

          const derive_account_with_secret_numbers = accountlib.derive.secretNumbers(secretNumbers);
          console.log(`account ${JSON.stringify(derive_account_with_secret_numbers, null, '\t')}`);
          res.json(derive_account_with_secret_numbers);
     } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Failed to derive account from secret numbers' });
     }
});

app.listen(3000, () => console.log('Proxy running on http://localhost:3000'));
