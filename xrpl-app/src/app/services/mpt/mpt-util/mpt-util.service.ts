import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountFlags, MptDisplayItem, MPToken } from '../../../models/interface-items.model';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import * as xrpl from 'xrpl';
import { MPTokenIssuanceCreateFlags } from 'xrpl';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { PerformanceBaseComponent } from '../../../components/shared/performance-base/performance-base.component';
import { MptStoreService } from '../mpt-store/mpt-store.service';
import { MptFlagKey, MptFlags } from '../../../components/mpt/constants/mpt.types';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import { XrplService } from '../../xrpl-services/xrpl.service';

@Injectable({
     providedIn: 'root',
})
export class MptUtilService extends PerformanceBaseComponent {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly logService = inject(LogServiceService);
     override readonly xrplService = inject(XrplService);

     private readonly mptIssuanceCache = new Map<string, { node: any; timestamp: number }>();
     private readonly mptIssuanceRequests = new Map<string, Promise<any | null>>();
     private static readonly MPT_ISSUANCE_CACHE_TTL = 15_000;

     private readonly flagValues = {
          canLock: 0x00000002,
          isRequireAuth: 0x00000004,
          canEscrow: 0x00000008,
          canTrade: 0x00000010,
          canTransfer: 0x00000020,
          canClawback: 0x00000040,
          isAuthorized: 0x00000002,
     };
     flags = signal<MptFlags>({
          canLock: false,
          isRequireAuth: false,
          canEscrow: false,
          canTrade: false,
          canTransfer: false,
          canClawback: false,
     });

     totalFlagsValue = signal<number>(0);
     totalFlagsHex = signal<string>('0x0');

     readonly selectedMptIssuanceId = computed(() => this.mptStoreService.mptIssuanceId());

     readonly createMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create MPT';
          if (step === 'waiting_validation') return 'Create MPT';
          return this.txUiService.stepMessage();
     });

     readonly authorizeButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') {
               return this.mptStoreService.authAction() === 'authorize' ? 'Authorize MPT' : 'Unauthorize MPT';
          }
          if (step === 'waiting_validation') return this.mptStoreService.authAction() === 'authorize' ? 'Authorize MPT' : 'Unauthorize MPT';
          return this.txUiService.stepMessage();
     });

     readonly sendMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Send MPT';
          if (step === 'waiting_validation') return 'Send MPT';
          return this.txUiService.stepMessage();
     });

     readonly lockMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') {
               return this.mptStoreService.lockAction() === 'lock' ? 'Lock MPT' : 'Unlock MPT';
          }
          if (step === 'waiting_validation') return this.mptStoreService.lockAction() === 'lock' ? 'Lock MPT' : 'Unlock MPT';
          return this.txUiService.stepMessage();
     });

     readonly clawbackMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Clawback MPT';
          if (step === 'waiting_validation') return 'Clawback MPT';
          return this.txUiService.stepMessage();
     });

     readonly destroyMptButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Destroy MPT';
          if (step === 'waiting_validation') return 'Destroy MPT';
          return this.txUiService.stepMessage();
     });

     async getMpts(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const issuances = new Map<string, any>();
          const holdings: any[] = [];
          const accountObjectItems = accountObjects.result.account_objects ?? [];
          const vaultShareIds = new Set(
               accountObjectItems
                    .filter((obj: any) => obj.LedgerEntryType === 'Vault' && typeof obj.ShareMPTID === 'string')
                    .map((obj: any) => obj.ShareMPTID)
          );

          accountObjectItems.forEach(obj => {
               const o = obj as any;

               if (o.LedgerEntryType === 'MPTokenIssuance') {
                    issuances.set(o.mpt_issuance_id, o);
                    this.cacheMptIssuance(o.mpt_issuance_id, o);
                    this.mptStoreService.updateField('assetScaleCache', cache => {
                         const newCache = new Map(cache);
                         newCache.set(o.mpt_issuance_id, o.AssetScale ?? 0);
                         return newCache;
                    });
               } else if (o.LedgerEntryType === 'MPToken' && o.Account === classicAddress) {
                    holdings.push(o);
               }
          });

          const result: any[] = [];
          const client = holdings.length > 0 ? await this.xrplService.getClient() : null;
          const mptNodes = client
               ? await Promise.all(holdings.map(holding => this.getMptIssuanceNode(client, holding.MPTokenIssuanceID)))
               : [];

          for (const [index, holding] of holdings.entries()) {
               const issuance = issuances.get(holding.MPTokenIssuanceID);
               const rawBalance = holding.MPTAmount || '0';
               const hasPositiveBalance = Number(rawBalance) > 0;
               const mptNode = mptNodes[index];
               if (!mptNode) {
                    continue;
               }

               const issuer = issuance?.Issuer || issuance?.Account || mptNode.Issuer || mptNode.Account || 'Unknown';
               const isIssuerOwnedZeroBalance = !hasPositiveBalance && issuer === classicAddress;
               const assetScale = issuance?.AssetScale ?? mptNode.AssetScale ?? this.mptStoreService.assetScaleCache().get(holding.MPTokenIssuanceID) ?? 0;
               this.mptStoreService.updateField('assetScaleCache', cache => {
                    const newCache = new Map(cache);
                    newCache.set(holding.MPTokenIssuanceID, assetScale);
                    return newCache;
               });

               result.push({
                    LedgerEntryType: mptNode.LedgerEntryType,
                    id: mptNode.index,
                    mpt_issuance_id: mptNode.mpt_issuance_id,
                    MPTAmount: holding.MPTAmount || '0',
                    AssetScale: assetScale,
                    OutstandingAmount: mptNode.OutstandingAmount,
                    MaximumAmount: 'Not Set',
                    TransferFee: '0',
                    MPTokenMetadata: 'N/A',
                    Flags: mptNode.Flags || 0,
                    holderFlags: Number(holding.Flags) || 0,
                    Issuer: issuer,
                    isHolder: !isIssuerOwnedZeroBalance,
                    isVaultMpt: vaultShareIds.has(holding.MPTokenIssuanceID),
                    amount: holding.MPTAmount || '0',
                    Account: holding.Account || '',
               });
          }

          // Issuances you own
          for (const [id, issuance] of issuances.entries()) {
               const alreadyAdded = result.some(r => r.mpt_issuance_id === id);
               if (!alreadyAdded) {
                    result.push({
                         LedgerEntryType: 'MPTokenIssuance',
                         id: issuance.index,
                         mpt_issuance_id: issuance.mpt_issuance_id,
                         MPTAmount: '0',
                         AssetScale: issuance.AssetScale ?? 0,
                         OutstandingAmount: issuance.OutstandingAmount || '0',
                         MaximumAmount: issuance.MaximumAmount || 'Not Set',
                         TransferFee: issuance.TransferFee || '0',
                         MPTokenMetadata: issuance.MPTokenMetadata || 'N/A',
                         Flags: issuance.Flags || 0, // ← CRITICAL FIX
                         Issuer: issuance.Issuer || issuance.Account || 'Unknown',
                         isHolder: false,
                         isVaultMpt: vaultShareIds.has(id),
                         amount: issuance.OutstandingAmount || '0',
                         Account: issuance.Account || issuance.Issuer || '',
                    });
               }
          }

          return result;
     }

     private getMptIssuanceCacheKey(issuanceId: string): string {
          const network = this.xrplService.getNet().environment;
          return `${network}:${issuanceId.toUpperCase()}`;
     }

     private cacheMptIssuance(issuanceId: string, node: any): void {
          if (!issuanceId || !node) return;
          this.mptIssuanceCache.set(this.getMptIssuanceCacheKey(issuanceId), {
               node,
               timestamp: Date.now(),
          });
     }

     private async getMptIssuanceNode(client: xrpl.Client, issuanceId: string): Promise<any | null> {
          const key = this.getMptIssuanceCacheKey(issuanceId);
          const cached = this.mptIssuanceCache.get(key);
          if (cached && Date.now() - cached.timestamp < MptUtilService.MPT_ISSUANCE_CACHE_TTL) {
               return cached.node;
          }
          this.mptIssuanceCache.delete(key);

          const inFlight = this.mptIssuanceRequests.get(key);
          if (inFlight) return inFlight;

          const request = this.xrplService.doesMptExist(client, issuanceId).then(mptData => {
               const node = mptData?.node ?? mptData?.result?.node ?? null;
               if (node) this.cacheMptIssuance(issuanceId, node);
               return node;
          }).finally(() => {
               this.mptIssuanceRequests.delete(key);
          });
          this.mptIssuanceRequests.set(key, request);
          return request;
     }

     getExistingMpts(escrowObjects: xrpl.AccountObjectsResponse, classicAddress: string) {
          const mapped = (escrowObjects.result.account_objects ?? [])
               .filter((obj: any) => (obj.LedgerEntryType === 'MPToken' || obj.LedgerEntryType === 'MPTokenIssuance') && (obj.Account === classicAddress || obj.Issuer === classicAddress))
               .map((obj: any): MPToken => {
                    return {
                         LedgerEntryType: obj.LedgerEntryType,
                         MPTAmount: obj.MaximumAmount ? obj.MaximumAmount : obj.MPTAmount,
                         mpt_issuance_id: obj.mpt_issuance_id ? obj.mpt_issuance_id : obj.MPTokenIssuanceID,
                         MPTokenMetadata: obj.MPTokenMetadata ? obj.MPTokenMetadata : '',
                    };
               })
               .sort((a, b) => {
                    const ai = a.mpt_issuance_id ?? '';
                    const bi = b.mpt_issuance_id ?? '';
                    return ai.localeCompare(bi);
               });

          this.logService.logObjects('existingMpts', mapped);
          return mapped;
     }

     computeMptItems(existingMpts: any[]): MptDisplayItem[] {
          return existingMpts.map(m => {
               const assetScale = m.AssetScale ?? 0;

               // Get the appropriate amount based on the entry type
               let rawAmount: string;
               let displayType: string;

               if (m.LedgerEntryType === 'MPToken') {
                    // Holder: use their balance
                    rawAmount = m.MPTAmount || '0';
                    displayType = 'held';
               } else {
                    // Issuer: show OutstandingAmount (tokens issued so far)
                    // If OutstandingAmount is 0, it means no tokens have been issued yet
                    rawAmount = m.OutstandingAmount || m.MPTAmount || '0';
                    displayType = 'issued';
               }

               const formatted = this.formatMptAmount(rawAmount, assetScale);

               return {
                    id: m.mpt_issuance_id || m.id,
                    display: `MPT • ${formatted} ${displayType}`,
                    secondary: (m.mpt_issuance_id || m.id || '').slice(0, 15) + '...' + (m.mpt_issuance_id || m.id || '').slice(-10),
               };
          });
     }

     mptDropDownItems(existingMpts: any[]) {
          return computed(() => {
               const t = existingMpts.map(m => {
                    const type = m.LedgerEntryType === 'MPToken' ? 'MPToken' : 'MPTokenIssuance';
                    let isHolder = false;
                    if (type === 'MPToken') {
                         isHolder = true;
                    }

                    // Get the raw amount
                    const rawAmount = isHolder ? m.MPTAmount || '0' : m.OutstandingAmount || '0';

                    // Get the asset scale (for holders, this should be set from the issuance)
                    const assetScale = m.AssetScale ?? 0;

                    // Format the amount using the asset scale
                    const formattedAmount = this.formatMptAmount(rawAmount, assetScale);

                    return {
                         id: m.mpt_issuance_id ? m.mpt_issuance_id : m.id,
                         display: `MPT • ${formattedAmount} ${isHolder ? 'held' : 'issued'}`,
                         secondary: m.mpt_issuance_id ? m.mpt_issuance_id.slice(0, 15) + '...' + m.mpt_issuance_id.slice(-10) : m.id.slice(0, 12) + '...' + m.id.slice(-10),
                         isCurrentAccount: false,
                         isCurrentCode: false,
                         isCurrentToken: false,
                    };
               });
               return t;
          });
     }

     computeSelectedMptItem(items: MptDisplayItem[], issuanceId: string | null | undefined): MptDisplayItem | null {
          if (!issuanceId) return null;

          return items.find(i => i.id === issuanceId) ?? null;
     }

     selectedMptItem(mptIssuanceIdField: any, mptItems: any) {
          return computed(() => {
               const id = mptIssuanceIdField;
               if (!id) return null;
               return mptItems().find((i: { id: any }) => i.id === id) || null;
          });
     }

     selectMptFromList(mpt: any) {
          const id = mpt.mpt_issuance_id || mpt.id || '';
          if (!id) return;

          this.mptStoreService.setField('mptIssuanceId', id);

          // You can pre-fill amount or other fields here in the future if needed
          console.log('✅ MPT selected from summary:', id);
     }

     getMetadataByteLength(metaDataField: any) {
          return computed(() => {
               const meta = metaDataField().trim();
               if (!meta) return 0;

               try {
                    // Convert to hex (same as xrpl.convertStringToHex does)
                    const hex = xrpl.convertStringToHex(meta);
                    return hex.length / 2; // hex string: 2 chars = 1 byte
               } catch {
                    return 0;
               }
          });
     }

     metadataIsValid(metadataByteLength: any) {
          return computed(() => {
               return metadataByteLength() <= 1024;
          });
     }

     getAllMptTokens(accountObjects: xrpl.AccountObjectsResponse) {
          const mptokens = accountObjects.result.account_objects.filter((o: any) => o.LedgerEntryType === 'MPTToken' || o.LedgerEntryType === 'MPTokenIssuance' || o.LedgerEntryType === 'MPToken');
          const accountIssuerToken = mptokens.some((obj: any) => obj.mpt_issuance_id === this.mptStoreService.mptIssuanceId());
          return accountIssuerToken;
     }

     getMPTokenIssuance(accountObjects: xrpl.AccountObjectsResponse) {
          const mptokens = accountObjects.result.account_objects.filter((o: any) => o.LedgerEntryType === 'MPTokenIssuance');
          const accountIssuerToken = mptokens.some((obj: any) => obj.mpt_issuance_id === this.mptStoreService.mptIssuanceId());
          return accountIssuerToken;
     }

     getMptToken(accountObjects: xrpl.AccountObjectsResponse) {
          const mptokens = accountObjects.result.account_objects.filter((o: any) => o.LedgerEntryType === 'MPToken');
          const accountIssuerToken = mptokens.some((obj: any) => obj.mpt_issuance_id === this.mptStoreService.mptIssuanceId());
          return accountIssuerToken;
     }

     isDestinationAuthorizedForMpt(issuanceObjects: any[], holderObjects: any[], issuanceId: string): boolean {
          const issuance = issuanceObjects.find((o: any) => o.LedgerEntryType === 'MPTokenIssuance' && o.mpt_issuance_id === issuanceId);
          if (!issuance) return false;

          const requiresAuth = this.issuanceRequiresAuth(issuance.Flags);
          if (!requiresAuth) return true;

          const holder = holderObjects.find((o: any) => o.LedgerEntryType === 'MPToken' && o.MPTokenIssuanceID === issuanceId);

          const isAuth = holder ? this.holderIsAuthorized(holder.Flags) : false;
          return isAuth;
     }

     getIssuerFromMptId(id: string): string | null {
          if (!/^[0-9A-Fa-f]{48}$/.test(id)) return null;
          const bytes = id.slice(8).match(/../g)!.map(h => parseInt(h, 16));
          return xrpl.encodeAccountID(bytes as any);
     }

     issuanceRequiresAuth(flags: number): boolean {
          return (flags & this.flagValues.isRequireAuth) !== 0;
     }

     holderIsAuthorized(flags: number): boolean {
          return (flags & this.flagValues.isAuthorized) !== 0;
     }

     toggleFlag1(flag: MptFlagKey): void {
          this.flags()[flag] = !this.flags()[flag];
          this.updateFlagTotal();
     }

     toggleFlag(flag: MptFlagKey): void {
          this.flags.update(current => ({
               ...current,
               [flag]: !current[flag],
          }));
          this.updateFlagTotal();
     }

     updateFlagTotal() {
          let sum = 0;
          if (this.flags().canLock) sum |= this.flagValues.canLock;
          if (this.flags().isRequireAuth) sum |= this.flagValues.isRequireAuth;
          if (this.flags().canEscrow) sum |= this.flagValues.canEscrow;
          if (this.flags().canTrade) sum |= this.flagValues.canTrade;
          if (this.flags().canTransfer) sum |= this.flagValues.canTransfer;
          if (this.flags().canClawback) sum |= this.flagValues.canClawback;

          this.totalFlagsValue.set(sum);
          this.totalFlagsHex.set('0x' + sum.toString(16).toUpperCase().padStart(8, '0'));
     }

     resetFlags() {
          this.flags.update(current => ({
               canLock: false,
               isRequireAuth: false,
               canEscrow: false,
               canTrade: false,
               canTransfer: false,
               canClawback: false,
          }));
          this.updateFlagTotal();
     }

     getFlagsValue(flags: AccountFlags): number {
          let v_flags = 0;
          if (flags.canLock) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanLock; // 0x00000002
          }
          if (flags.isRequireAuth) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTRequireAuth; // 0x00000004
          }
          if (flags.canEscrow) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanEscrow; // 0x00000008
          }
          if (flags.canTrade) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanTrade; // 0x00000010
          }
          if (flags.canTransfer) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanTransfer; // 0x00000020
          }
          if (flags.canClawback) {
               v_flags |= MPTokenIssuanceCreateFlags.tfMPTCanClawback; // 0x00000040;
          }
          return v_flags;
     }

     decodeMPTFlags(flags: number) {
          const MPT_FLAGS = {
               tfMPTCanLock: 0x00000002,
               tfMPTRequireAuth: 0x00000004,
               tfMPTCanEscrow: 0x00000008,
               tfMPTCanTrade: 0x00000010,
               tfMPTCanTransfer: 0x00000020,
               tfMPTCanClawback: 0x00000040,
          };

          const activeFlags = [];
          for (const [name, value] of Object.entries(MPT_FLAGS)) {
               if ((flags & value) !== 0) {
                    activeFlags.push(name);
               }
          }
          return activeFlags;
     }

     decodeMptFlagsForUi(flags: number): string {
          const flagDefinitions = [
               { value: 2, name: 'canLock' }, // 0x00000002
               { value: 4, name: 'isRequireAuth' }, // 0x00000004
               { value: 8, name: 'canEscrow' }, // 0x00000008
               { value: 16, name: 'canTrade' }, // 0x00000010 (not 10!)
               { value: 32, name: 'canTransfer' }, // 0x00000020 (not 16!)
               { value: 64, name: 'canClawback' }, // 0x00000040 (not 40!)
          ];

          const activeFlags: string[] = [];

          for (const flag of flagDefinitions) {
               if ((flags & flag.value) === flag.value) {
                    activeFlags.push(flag.name);
               }
          }

          return activeFlags.length > 0 ? activeFlags.join(', ') : 'None';
     }

     formatMptAmount(rawAmount: string | number, assetScale: number | string | undefined): string {
          if (!rawAmount || rawAmount === '0') return '0';

          const amountStr = rawAmount.toString();

          // Convert scale safely
          let scale = 0;
          if (assetScale !== undefined && assetScale !== null && assetScale !== 'N/A') {
               // Handle both number and string inputs
               scale = typeof assetScale === 'number' ? assetScale : Number.parseInt(assetScale.toString(), 10);
               if (Number.isNaN(scale)) scale = 0;
          }

          if (scale <= 0) return amountStr;

          const padded = amountStr.padStart(scale + 1, '0');
          const integerPart = padded.slice(0, -scale) || '0';
          const decimalPart = padded.slice(-scale);

          if (decimalPart === '0'.repeat(scale)) {
               return integerPart;
          }

          // Remove trailing zeros
          return `${integerPart}.${decimalPart.replace(/0+$/, '')}`;
     }

     convertToBaseUnits(amount: string | number, assetScale: number): string {
          if (!Number.isInteger(assetScale) || assetScale < 0 || assetScale > 15) {
               throw new Error('MPT asset scale must be an integer between 0 and 15.');
          }

          const cleanAmount = amount.toString().trim().replace(/,/g, '');
          const parts = cleanAmount.split('.');
          if (parts.length > 2 || !/^\d+$/.test(parts[0]) || (parts[1] !== undefined && !/^\d*$/.test(parts[1]))) {
               throw new Error('MPT amount must be a non-negative decimal number.');
          }

          const integerPart = parts[0].replace(/^0+/, '') || '0';
          const decimalPart = parts[1] || '';
          if (decimalPart.length > assetScale && /[1-9]/.test(decimalPart.slice(assetScale))) {
               throw new Error(`MPT amount cannot have more than ${assetScale} decimal places.`);
          }

          const fractionalBaseUnits = decimalPart.slice(0, assetScale).padEnd(assetScale, '0');
          return `${integerPart}${fractionalBaseUnits}`.replace(/^0+/, '') || '0';
     }

     hasNoOutstandingMpts = computed(() => {
          const existingMpts = this.mptStoreService.existingMpts();
          const selectedMptId = this.mptStoreService.mptIssuanceId();

          // Find the selected MPT
          const selectedMpt = existingMpts.find(
               m => (m.mpt_issuance_id === selectedMptId || m.id === selectedMptId) && m.LedgerEntryType === 'MPTokenIssuance' // Only check issuances
          );

          if (!selectedMpt) return true; // No MPT selected, can destroy

          // Check if outstanding amount is 0 or not
          const outstandingAmount = selectedMpt.OutstandingAmount || '0';
          return outstandingAmount === '0';
     });

     // Add computed signal for canDestroy with authorization check
     readonly canDestroyMpt = computed(() => {
          const hasNoOutstanding = this.hasNoOutstandingMpts();
          if (!hasNoOutstanding) return false;

          const selectedMptId = this.mptStoreService.mptIssuanceId();
          if (!selectedMptId) return false;

          // Get authorized holders for this MPT
          const authorizedHolders = this.mptStoreService.getAuthorizedHolders(selectedMptId);

          // If there are authorized holders, show warning but allow destruction
          if (authorizedHolders.length > 0) {
               return true; // Allow destruction but with warning
          }

          return true;
     });

     getAuthorizedHolders(issuanceId: string, accountObjects: xrpl.AccountObjectsResponse): string[] {
          const holders: string[] = [];

          // Safety check
          if (!accountObjects?.result?.account_objects) {
               return holders;
          }

          // Find all MPToken entries for this issuance
          const mptTokens = accountObjects.result.account_objects.filter(obj => {
               const anyObj = obj as any;
               return (anyObj.LedgerEntryType === 'MPToken' || anyObj.LedgerEntryType === 'MPTokenIssuance') && anyObj.MPTokenIssuanceID === issuanceId;
          });

          // Check which ones have the authorized flag
          for (const token of mptTokens) {
               const anyToken = token as any;
               const flags = anyToken.Flags || 0;
               const isAuthorized = (flags & 0x00000002) !== 0; // tfMPTAuthorized flag

               const account = anyToken.Account;
               if (isAuthorized && account) {
                    holders.push(account);
               }
          }

          // Cache this for later use (using Record)
          if (holders.length > 0) {
               const currentHolders = this.mptStoreService.authorizedHolders();
               this.mptStoreService.setAuthorizedHolders(issuanceId, holders);
          }

          return holders;
     }

     async refreshAuthorizedHolders(issuanceId: string, client: xrpl.Client, candidateHolders: string[] = []): Promise<string[]> {
          const trackedHolders = this.mptStoreService.getAuthorizedHolders(issuanceId);
          const holdersToCheck = [...new Set([...trackedHolders, ...candidateHolders])];
          if (holdersToCheck.length === 0) return trackedHolders;

          const authorizationStates = await Promise.allSettled(
               holdersToCheck.map(async holder => {
                    let marker: string | undefined;
                    do {
                         const response = await client.request({
                              command: 'account_objects',
                              account: holder,
                              ledger_index: 'validated',
                              limit: 400,
                              ...(marker ? { marker } : {}),
                         });
                         const isAuthorized = response.result.account_objects.some(obj => {
                              const token = obj as any;
                              return token.LedgerEntryType === 'MPToken'
                                   && String(token.MPTokenIssuanceID).toUpperCase() === issuanceId.toUpperCase()
                                   && ((token.Flags || 0) & 0x00000002) !== 0;
                         });
                         if (isAuthorized) return holder;
                         marker = response.result.marker;
                    } while (marker);
                    return null;
               })
          );
          const failedLookups = authorizationStates.filter(result => result.status === 'rejected');
          const successfulLookups = authorizationStates.filter(result => result.status === 'fulfilled');
          if (successfulLookups.length === 0 && failedLookups.length > 0) {
               throw new Error('Unable to verify authorized holders for this MPT.');
          }

          const authorizedHolders = successfulLookups
               .map(result => result.value)
               .filter((holder): holder is string => holder !== null);
          for (const failedLookup of failedLookups) {
               const error = failedLookup.status === 'rejected' ? failedLookup.reason : null;
               console.error('Unable to check one wallet for MPT authorization:', error);
          }
          if (failedLookups.length > 0) {
               const previouslyTracked = new Set(trackedHolders);
               for (const holder of holdersToCheck) {
                    const lookupIndex = holdersToCheck.indexOf(holder);
                    if (authorizationStates[lookupIndex]?.status === 'rejected' && previouslyTracked.has(holder)) {
                         authorizedHolders.push(holder);
                    }
               }
          }

          if (authorizedHolders.length > 0) {
               this.mptStoreService.setAuthorizedHolders(issuanceId, authorizedHolders);
          }
          return authorizedHolders;
     }

     // Update getDestroyWarningMessage to use the Record
     getDestroyWarningMessage(): string | null {
          const selectedMptId = this.mptStoreService.mptIssuanceId();
          if (!selectedMptId) return null;

          const authorizedHolders = this.mptStoreService.getAuthorizedHolders(selectedMptId);

          if (authorizedHolders.length > 0) {
               const holdersList = authorizedHolders.slice(0, 3).join(', ');
               const moreText = authorizedHolders.length > 3 ? ` and ${authorizedHolders.length - 3} others` : '';
               // return `This MPT has ${authorizedHolders.length} authorized holder(s) (${holdersList}${moreText}).
               return `This MPT has ${authorizedHolders.length} authorized holder(s). 
            Destroying it will orphan these authorizations. 
            Recommended: Revoke all authorizations first.`;
          }

          return null;
     }
}
