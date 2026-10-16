import { expect, Page, test } from '@playwright/test';
import { generateWallet, mainButton, openMpt, selectWallet, tab } from './helpers';

const DEVNET_RPC = 'https://s.devnet.rippletest.net:51234';

async function rpc(method: string, params: object) {
     const res = await fetch(DEVNET_RPC, { method: 'POST', body: JSON.stringify({ method, params: [params] }) });
     return (await res.json()).result;
}

async function issuanceIds(issuer: string): Promise<string[]> {
     const r = await rpc('account_objects', { account: issuer, type: 'mpt_issuance' });
     return (r.account_objects ?? []).map((o: { mpt_issuance_id?: string }) => o.mpt_issuance_id).filter(Boolean);
}

async function holdings(holder: string): Promise<Record<string, string>> {
     const r = await rpc('account_objects', { account: holder, type: 'mptoken' });
     const out: Record<string, string> = {};
     for (const o of r.account_objects ?? []) out[o.MPTokenIssuanceID] = o.MPTAmount ?? '0';
     return out;
}

async function holderFlags(holder: string, issuanceId: string): Promise<number | undefined> {
     const r = await rpc('account_objects', { account: holder, type: 'mptoken' });
     return r.account_objects?.find((o: { MPTokenIssuanceID: string }) => o.MPTokenIssuanceID === issuanceId)?.Flags;
}

async function addresses(page: Page): Promise<string[]> {
     const expand = page.getByRole('button', { name: 'Expand All Wallets' });
     if (await expand.isEnabled()) await expand.click();
     const text = await page.locator('aside, [role=complementary]').first().innerText();
     return [...text.matchAll(/Full Address\s+(r[1-9A-HJ-NP-Za-km-z]{24,34})/g)].map(m => m[1]);
}

/** Clicks the main action button and waits for a confirmed transaction in the preview. */
async function submit(page: Page, label: RegExp | string) {
     const preview = page.locator('app-transaction-preview');
     await mainButton(page, label).click();
     await expect(preview.getByText('Confirmed').last()).toBeVisible({ timeout: 60000 });
}

const idInput = (page: Page) => page.getByPlaceholder('Enter 48-character hex MPT Issuance ID');
const addrInput = (page: Page) => page.locator('input[placeholder="Enter or select destination address"]');

test.describe.serial('MPT full lifecycle (Devnet)', () => {
     test.setTimeout(10 * 60 * 1000);

     let page: Page;
     let issuer: string;
     let holder: string;
     let mptId: string;

     test.beforeAll(async ({ browser }) => {
          test.setTimeout(5 * 60 * 1000);
          page = await (await browser.newContext()).newPage();
          await openMpt(page);
          await generateWallet(page, 1);
          await generateWallet(page, 2);
          [issuer, holder] = await addresses(page);
          expect(issuer).toBeTruthy();
          expect(holder).toBeTruthy();
     });

     test.afterAll(async () => page.context().close());

     test('create: issuer creates a lockable, auth-required, transferable, clawback-enabled MPT', async () => {
          await selectWallet(page, 'Wallet 1');
          await tab(page, 'Create');
          await page.getByRole('button', { name: '1,000,000', exact: true }).click();
          await page.getByRole('button', { name: '2', exact: true }).first().click();
          for (const f of ['MPTCanLock', 'MPTRequireAuth', 'MPTCanTransfer', 'MPTCanClawback']) {
               await page.locator('label', { hasText: f }).click();
          }
          await page.getByRole('button', { name: '500', exact: true }).click();
          await submit(page, /Create MPT/);

          const ids = await issuanceIds(issuer);
          expect(ids.length).toBe(1);
          mptId = ids[0];
          expect(mptId).toMatch(/^[0-9A-F]{48}$/i);
     });

     test('authorize: holder opts in to the MPT', async () => {
          await selectWallet(page, 'Wallet 2');
          await tab(page, 'Authorize');
          await page.locator('label', { hasText: /^\s*Authorize\s*$/ }).click();
          await addrInput(page).fill(issuer);
          await idInput(page).fill(mptId);
          await submit(page, /Authorize MPT/);
          expect(Object.keys(await holdings(holder))).toContain(mptId);
     });

     test('authorize: issuer authorizes the holder (RequireAuth)', async () => {
          await selectWallet(page, 'Wallet 1');
          await tab(page, 'Authorize');
          await page.locator('label', { hasText: /^\s*Authorize\s*$/ }).click();
          await addrInput(page).fill(holder);
          await idInput(page).fill(mptId);
          await submit(page, /Authorize MPT/);
          await expect.poll(() => holderFlags(holder, mptId), { timeout: 60000 }).toBeGreaterThan(0);
     });

     test('send: issuer sends 100 to holder', async () => {
          await tab(page, 'Send');
          await idInput(page).fill(mptId);
          await addrInput(page).fill(holder);
          await page.getByPlaceholder('e.g. 10').fill('100');
          await submit(page, /Send MPT/);
          expect((await holdings(holder))[mptId]).toBe('100');
     });

     test('lock then unlock: issuer locks the holder, then unlocks', async () => {
          await tab(page, 'Unlock');
          await page.locator('label', { hasText: /^\s*Lock\s*$/ }).click();
          await addrInput(page).fill(holder);
          await idInput(page).fill(mptId);
          await submit(page, /Lock MPT/);

          await page.locator('label', { hasText: /^\s*Unlock\s*$/ }).click();
          await addrInput(page).fill(holder);
          await idInput(page).fill(mptId);
          await submit(page, /Unlock MPT/);
     });

     test('clawback: issuer claws back 10 from holder', async () => {
          await tab(page, 'Clawback');
          await idInput(page).fill(mptId);
          await addrInput(page).fill(holder);
          await page.getByPlaceholder('e.g. 10').fill('10');
          await submit(page, /Clawback MPT/);
          expect((await holdings(holder))[mptId]).toBe('90');
     });

     test('send: holder returns the remaining 90 to the issuer', async () => {
          await selectWallet(page, 'Wallet 2');
          await tab(page, 'Send');
          await idInput(page).fill(mptId);
          await addrInput(page).fill(issuer);
          await page.getByPlaceholder('e.g. 10').fill('90');
          await submit(page, /Send MPT/);
          expect((await holdings(holder))[mptId] ?? '0').toBe('0');
     });

     test('unauthorize: holder removes the MPT holding', async () => {
          await tab(page, 'Authorize');
          await page.locator('label', { hasText: /^\s*Unauthorize\s*$/ }).click();
          await addrInput(page).fill(issuer);
          await idInput(page).fill(mptId);
          await submit(page, /Unauthorize MPT/);
          expect(Object.keys(await holdings(holder))).not.toContain(mptId);
     });

     test('destroy: issuer destroys the issuance', async () => {
          await selectWallet(page, 'Wallet 1');
          await tab(page, 'Destroy');
          await page.getByPlaceholder('Search by ID or amount...').click();
          await page.getByText(mptId.slice(0, 8), { exact: false }).first().click();
          await submit(page, /Destroy MPT/);
          expect(await issuanceIds(issuer)).not.toContain(mptId);
     });
});
