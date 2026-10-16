import { expect, Page } from '@playwright/test';

export async function openMpt(page: Page) {
     await page.goto('/mpt');
     await expect(page.getByTitle(/Fully synced/).first()).toBeVisible({ timeout: 60000 });
}

/** Generates a faucet-funded wallet and returns its display name (e.g. "Wallet 2"). */
export async function generateWallet(page: Page, expectedCount: number): Promise<string> {
     await page.getByRole('button', { name: 'Generate New Wallet' }).click();
     await expect(page.getByText(new RegExp(`Total Accounts?: ${expectedCount}`))).toBeVisible({ timeout: 120000 });
     const name = `Wallet ${expectedCount}`;
     const expand = page.getByRole('button', { name: 'Expand All Wallets' });
     if (await expand.isEnabled()) await expand.click();
     await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 120000 });
     await expect(page.getByRole('button', { name: 'Generate New Wallet' })).toBeEnabled();
     await page.waitForTimeout(5000);
     return name;
}

export async function selectWallet(page: Page, name: string) {
     const card = page.getByText(name, { exact: true }).locator('xpath=ancestor::div[contains(@class, "group")][1]');
     const select = card.getByRole('button', { name: 'Select', exact: true });
     if (await select.isVisible()) await select.click();
     await expect(page.getByText(`Currently Selected Account: ${name}`)).toBeVisible();
}

export async function tab(page: Page, name: string) {
     await page.getByRole('button', { name, exact: true }).click();
}

export const mainButton = (page: Page, label: RegExp | string) => page.locator('.main-button-section').getByRole('button', { name: label });
