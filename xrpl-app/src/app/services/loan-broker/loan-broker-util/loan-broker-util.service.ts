import { computed, inject, Injectable, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import BigNumber from 'bignumber.js';
import { LoanBrokerActionTypes, LoanBrokerDisplayItem } from '../../../components/loan-broker/constants/loan-broker.types';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { LoanBrokerStoreService } from '../loan-broker-store/loan-broker-store.service';
import { MAX_DATA_LENGTH } from '../../../components/loan/constants/loan.constants';
import { MAX_COVER_RATE_MINIMUM, MAX_MANAGEMENT_FEE_RATE } from '../../../components/loan-broker/constants/loan-broker.constants';
import { LogServiceService } from '../../shared/log-service/log-service.service';

@Injectable({
     providedIn: 'root',
})
export class LoanBrokerUtilService {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly logService = inject(LogServiceService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);

     readonly selectedBrokerId = signal<string | null>(null);

     onBrokerSelectedInUi(broker: LoanBrokerDisplayItem) {
          const brokerId = broker.index || broker.id;
          if (brokerId) {
               this.loanBrokerStoreService.setField('selectedBrokerId', brokerId);
          }
     }

     async getExistingBrokers(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): Promise<LoanBrokerDisplayItem[]> {
          const filtered = (accountObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'LoanBroker');

          const mapped = await Promise.all(
               filtered.map(async (obj: any): Promise<LoanBrokerDisplayItem> => {
                    // Decode Data field if present
                    let decodedData = '';
                    if (obj.Data) {
                         try {
                              decodedData = xrpl.convertHexToString(obj.Data);
                         } catch {
                              decodedData = obj.Data;
                         }
                    }

                    return {
                         tab: 'createBroker' as any,
                         id: obj.index || '',
                         index: obj.index || '',
                         VaultID: obj.VaultID || '',
                         Sequence: obj.Sequence,
                         LoanBrokerID: obj.LoanBrokerID || '',
                         Data: decodedData,
                         ManagementFeeRate: obj.ManagementFeeRate,
                         CoverAvailable: obj.CoverAvailable,
                         CoverRateLiquidation: obj.CoverRateLiquidation,
                         CoverRateMinimum: obj.CoverRateMinimum,
                         CoverBalance: obj.CoverBalance,
                         DebtMaximum: this.formatXRPLNumber(obj.DebtMaximum),
                         DebtTotal: obj.DebtTotal,
                         owner: obj.Owner || '',
                         Account: obj.Account || '',
                         display: `Broker ${(obj.LoanBrokerID || obj.index || '').slice(0, 8)}...`,
                    };
               })
          );

          mapped.sort((a, b) => (a.LoanBrokerID || '').localeCompare(b.LoanBrokerID || ''));
          this.logService.logObjects(`getExistingBrokers`, mapped);
          return mapped;
     }

     async getBrokerCoverBalance(client: xrpl.Client, brokerId: string): Promise<string> {
          try {
               const result = await this.xrplCache.getBrokerInfo(client, brokerId);
               const node = result.result?.node;
               if (node && node.LedgerEntryType === 'LoanBroker') {
                    // The cover balance is stored as CoverAvailable
                    return node.CoverAvailable || '0';
               }
               return '0';
          } catch {
               return '0';
          }
     }

     private formatXRPLNumber(value: any): string {
          if (!value) return '0';
          if (typeof value === 'string') {
               try {
                    return xrpl.dropsToXrp(value).toString();
               } catch {
                    return value;
               }
          }
          if (typeof value === 'number') {
               return value.toString();
          }
          if (value?.value) {
               return value.value;
          }
          return '0';
     }

     brokerItems(brokers: LoanBrokerDisplayItem[], activeTab: LoanBrokerActionTypes, currentAddress: string | null): SelectItem[] {
          if (!brokers || brokers.length === 0) return [];

          // Filter based on tab
          let filteredBrokers = brokers;

          // For create, modify, delete, clawback - only show owned brokers
          // if (activeTab === 'createBroker' || activeTab === 'modifyBroker' || activeTab === 'deleteBroker' || activeTab === 'coverClawback') {
          //      if (currentAddress) {
          //           filteredBrokers = brokers.filter(broker => broker.owner === currentAddress || broker.Account === currentAddress);
          //      }
          // }
          // For deposit and withdraw - show ALL brokers (no filtering)
          // coverDeposit and coverWithdraw show all brokers

          return filteredBrokers.map(broker => {
               const brokerId = broker.index || broker.id || '';
               const loanBrokerId = broker.LoanBrokerID || '';
               const vaultId = broker.VaultID || '';
               const shortId = loanBrokerId.length > 16 ? `${loanBrokerId.slice(0, 8)}...${loanBrokerId.slice(-8)}` : loanBrokerId;
               const shortVault = vaultId.length > 16 ? `${vaultId.slice(0, 8)}...${vaultId.slice(-8)}` : vaultId;
               const owner = broker.owner || broker.Account || '';
               const shortOwner = owner.length > 12 ? `${owner.slice(0, 6)}...${owner.slice(-6)}` : owner;

               return {
                    id: brokerId,
                    label: `Broker ${shortId}`,
                    secondaryLabel: `Vault: ${shortVault} | Owner: ${shortOwner}`,
                    display: `${shortId} (${shortVault})`,
                    brokerId: loanBrokerId,
                    vaultId: vaultId,
               };
          });
     }

     // brokerItems(brokers: LoanBrokerDisplayItem[]): SelectItem[] {
     //      if (!brokers || brokers.length === 0) return [];

     //      return brokers.map(broker => {
     //           const brokerId = broker.index || broker.id || '';
     //           const loanBrokerId = broker.LoanBrokerID || '';
     //           const vaultId = broker.VaultID || '';
     //           const shortId = loanBrokerId.length > 16 ? `${loanBrokerId.slice(0, 8)}...${loanBrokerId.slice(-8)}` : loanBrokerId;
     //           const shortVault = vaultId.length > 16 ? `${vaultId.slice(0, 8)}...${vaultId.slice(-8)}` : vaultId;
     //           const owner = broker.owner || broker.Account || '';
     //           const shortOwner = owner.length > 12 ? `${owner.slice(0, 6)}...${owner.slice(-6)}` : owner;

     //           return {
     //                id: brokerId,
     //                label: `Broker ${shortId}`,
     //                secondaryLabel: `Vault: ${shortVault} | Owner: ${shortOwner}`,
     //                display: `${shortId} (${shortVault})`,
     //                brokerId: loanBrokerId,
     //                vaultId: vaultId,
     //           };
     //      });
     // }

     async getBrokerByIdFromLedger(client: xrpl.Client, brokerId: string): Promise<LoanBrokerDisplayItem | null> {
          try {
               const result = await this.xrplCache.getBrokerInfo(client, brokerId);

               if (result.result?.node || result.result?.node.LedgerEntryType !== 'LoanBroker') {
                    const node = result.result.node;
                    // Parse the node data
                    let decodedData = '';
                    if (node.Data) {
                         try {
                              decodedData = xrpl.convertHexToString(node.Data);
                         } catch {
                              decodedData = node.Data;
                         }
                    }

                    return {
                         tab: 'coverDeposit' as any,
                         id: node.index || node.id || '',
                         index: node.index || node.id || '',
                         VaultID: node.VaultID || '',
                         LoanBrokerID: node.LoanBrokerID || '',
                         Data: decodedData,
                         ManagementFeeRate: node.ManagementFeeRate,
                         DebtMaximum: this.formatXRPLNumber(node.DebtMaximum),
                         CoverRateMinimum: node.CoverRateMinimum,
                         CoverRateLiquidation: node.CoverRateLiquidation,
                         owner: node.Account || node.Owner || '',
                         Account: node.Account || node.Owner || '',
                         display: `Broker ${(node.LoanBrokerID || node.index || '').slice(0, 8)}...`,
                    };
               }
               return null;
          } catch (error) {
               console.error('Failed to fetch broker from ledger:', error);
               return null;
          }
     }

     selectedBrokerItem(items: SelectItem[], selectedBrokerId: string | null): SelectItem | null {
          if (!selectedBrokerId) return null;
          return items.find(item => item.id === selectedBrokerId) || null;
     }

     getBrokerById(brokers: LoanBrokerDisplayItem[], brokerId: string): LoanBrokerDisplayItem | null {
          return (
               brokers.find(broker => {
                    const id = broker.index || broker.id;
                    return id === brokerId;
               }) || null
          );
     }

     // Validation methods
     validateVaultId(value: string): boolean {
          if (!value) return false;
          // Must be 64 character hex string
          return /^[0-9A-Fa-f]{64}$/.test(value);
     }

     validateBrokerId(value: string): boolean {
          if (!value) return true; // Optional
          // Must be 64 character hex string
          return /^[0-9A-Fa-f]{64}$/.test(value);
     }

     validateData(value: string): boolean {
          if (!value) return true;
          try {
               const hex = xrpl.convertStringToHex(value);
               return hex.length <= MAX_DATA_LENGTH * 2;
          } catch {
               return false;
          }
     }

     validateManagementFeeRate(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= 0 && value <= MAX_MANAGEMENT_FEE_RATE;
     }

     validateDebtMaximum(value: string): boolean {
          if (!value) return true;
          try {
               const num = new BigNumber(value);
               return num.isGreaterThanOrEqualTo(0);
          } catch {
               return false;
          }
     }

     validateCoverRate(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= 0 && value <= MAX_COVER_RATE_MINIMUM;
     }

     validateCoverRatePair(min: number | null, liquid: number | null): boolean {
          // Both must be zero or both non-zero
          const minVal = min ?? 0;
          const liquidVal = liquid ?? 0;
          return (minVal === 0 && liquidVal === 0) || (minVal !== 0 && liquidVal !== 0);
     }

     // Button labels
     readonly createBrokerButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Loan Broker';
          if (step === 'waiting_validation') return 'Create Loan Broker';
          return this.txUiService.stepMessage();
     });

     readonly modifyBrokerButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Modify Loan Broker';
          if (step === 'waiting_validation') return 'Modify Loan Broker';
          return this.txUiService.stepMessage();
     });

     // Add to the button labels section
     readonly deleteBrokerButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Delete Loan Broker';
          if (step === 'waiting_validation') return 'Delete Loan Broker';
          return this.txUiService.stepMessage();
     });

     readonly coverWithdrawButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Withdraw Cover';
          if (step === 'waiting_validation') return 'Withdraw Cover';
          return this.txUiService.stepMessage();
     });

     readonly coverDepositButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Deposit Cover';
          if (step === 'waiting_validation') return 'Deposit Cover';
          return this.txUiService.stepMessage();
     });

     readonly coverClawbackButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Clawback Cover';
          if (step === 'waiting_validation') return 'Clawback Cover';
          return this.txUiService.stepMessage();
     });
}
