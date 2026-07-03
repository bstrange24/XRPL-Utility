import { computed, inject, Injectable, signal } from '@angular/core';
import * as xrpl from 'xrpl';
import { LoanDisplayItem, LoanSet } from '../../../components/loan/constants/loan.types';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { ToastService } from '../../utils/toast/toast.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { SelectItem } from '../../../components/shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { AppConstants } from '../../../core/app.constants';
import { LoanStoreService } from '../loan-store/loan-store.service';
import { MAX_CLOSE_INTEREST_RATE, MAX_DATA_LENGTH, MAX_INTEREST_RATE, MAX_LATE_INTEREST_RATE, MAX_OVER_PAYMENT_FEE_RATE, MAX_OVER_PAYMENT_INTEREST_RATE, MIN_PAYMENT_INTERVAL } from '../../../components/loan/constants/loan.constants';
import { LogServiceService } from '../../shared/log-service/log-service.service';
import { LoanBrokerStoreService } from '../../loan-broker/loan-broker-store/loan-broker-store.service';
import { VaultStoreService } from '../../vault/vault-store/vault-store.service';

@Injectable({
     providedIn: 'root',
})
export class LoanUtilService {
     public readonly utilsService = inject(UtilsService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly toastService = inject(ToastService);
     public readonly logService = inject(LogServiceService);
     public readonly xrplDateService = inject(XrplDateService);
     private readonly xrplCache = inject(XrplCacheService);
     public readonly loanStoreService = inject(LoanStoreService);
     public readonly loanBrokerStoreService = inject(LoanBrokerStoreService);
     public readonly vaultStoreService = inject(VaultStoreService);

     readonly selectedLoanId = signal<string | null>(null);

     onLoanSelectedInUi(loan: LoanDisplayItem) {
          const loanId = loan.index || loan.id;
          if (loanId) {
               this.loanStoreService.setField('selectedLoanId', loanId);
          }
     }

     async getExistingLoans(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): Promise<LoanDisplayItem[]> {
          const filtered = (accountObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'Loan');

          const mapped = await Promise.all(
               filtered.map(async (obj: any): Promise<LoanDisplayItem> => {
                    const loanBrokerId = obj.LoanBrokerID || '';
                    const principalRequested = this.formatXRPLNumber(obj.PrincipalRequested);

                    let decodedData = '';
                    if (obj.Data) {
                         try {
                              decodedData = xrpl.convertHexToString(obj.Data);
                         } catch {
                              decodedData = obj.Data;
                         }
                    }

                    // Calculate remaining balance from PrincipalOutstanding
                    const remainingBalance = this.formatXRPLNumber(obj.PrincipalOutstanding) || principalRequested;

                    // Determine loan status
                    let status: 'active' | 'defaulted' | 'closed' | 'pending' | 'impaired' = 'active';
                    const flags = obj.Flags || 0;
                    if (flags & 0x00010000) {
                         status = 'defaulted';
                    }
                    if (obj.isImpaired) {
                         status = 'impaired';
                    }

                    return {
                         tab: 'createLoan' as any,
                         id: obj.index || '',
                         index: obj.index || '',
                         LoanBrokerID: loanBrokerId,
                         PrincipalRequested: principalRequested,
                         Counterparty: obj.Counterparty || '',
                         Data: decodedData,
                         LoanOriginationFee: this.formatXRPLNumber(obj.LoanOriginationFee),
                         LoanServiceFee: this.formatXRPLNumber(obj.LoanServiceFee),
                         LatePaymentFee: this.formatXRPLNumber(obj.LatePaymentFee),
                         ClosePaymentFee: this.formatXRPLNumber(obj.ClosePaymentFee),
                         OverpaymentFee: obj.OverpaymentFee,
                         InterestRate: obj.InterestRate,
                         LateInterestRate: obj.LateInterestRate,
                         CloseInterestRate: obj.CloseInterestRate,
                         OverpaymentInterestRate: obj.OverpaymentInterestRate,
                         PaymentTotal: obj.PaymentTotal,
                         PaymentInterval: obj.PaymentInterval,
                         GracePeriod: obj.GracePeriod,
                         LoanSequence: obj.LoanSequence,
                         NextPaymentDueDate: obj.NextPaymentDueDate,
                         PaymentRemaining: obj.PaymentRemaining,
                         PeriodicPayment: obj.PeriodicPayment,
                         PrincipalOutstanding: obj.PrincipalOutstanding,
                         StartDate: obj.StartDate,
                         TotalValueOutstanding: obj.TotalValueOutstanding,
                         Borrower: obj.Borrower || obj.Account || '',
                         // FIX: The Account field IS the owner/borrower
                         owner: obj.Account || obj.Owner || '', // Account is the borrower/owner
                         Account: obj.Account || obj.Owner || '', // Account is the borrower/owner
                         amountDisplay: `${principalRequested}`,
                         display: `Loan ${loanBrokerId.slice(0, 8)}... - ${principalRequested}`,
                         status: status,
                         remainingBalance: remainingBalance,
                         isImpaired: status === 'impaired',
                         isDefaulted: status === 'defaulted',
                    };
               })
          );

          mapped.sort((a, b) => (a.LoanBrokerID || '').localeCompare(b.LoanBrokerID || ''));
          this.logService.logObjects(`getExistingLoans`, mapped);
          return mapped;
     }

     async getExistingLoans123(accountObjects: xrpl.AccountObjectsResponse, classicAddress: string): Promise<LoanDisplayItem[]> {
          const filtered = (accountObjects.result.account_objects ?? []).filter((obj: any) => obj.LedgerEntryType === 'Loan');

          const mapped = await Promise.all(
               filtered.map(async (obj: any): Promise<LoanDisplayItem> => {
                    const loanBrokerId = obj.LoanBrokerID || '';
                    const principalRequested = this.formatXRPLNumber(obj.PrincipalRequested);

                    let decodedData = '';
                    if (obj.Data) {
                         try {
                              decodedData = xrpl.convertHexToString(obj.Data);
                         } catch {
                              decodedData = obj.Data;
                         }
                    }

                    // Calculate remaining balance (placeholder - would need actual payment history)
                    const remainingBalance = principalRequested;

                    // Determine loan status
                    let status: 'active' | 'defaulted' | 'closed' | 'pending' = 'active';
                    const flags = obj.Flags || 0;
                    if (flags & 0x00010000) {
                         // tfLoanDefault
                         status = 'defaulted';
                    }

                    return {
                         tab: 'createLoan' as any,
                         id: obj.index || '',
                         index: obj.index || '',
                         LoanBrokerID: loanBrokerId,
                         PrincipalRequested: principalRequested,
                         Counterparty: obj.Counterparty || '',
                         Data: decodedData,
                         LoanOriginationFee: this.formatXRPLNumber(obj.LoanOriginationFee),
                         LoanServiceFee: this.formatXRPLNumber(obj.LoanServiceFee),
                         LatePaymentFee: this.formatXRPLNumber(obj.LatePaymentFee),
                         ClosePaymentFee: this.formatXRPLNumber(obj.ClosePaymentFee),
                         OverpaymentFee: obj.OverpaymentFee,
                         InterestRate: obj.InterestRate,
                         LateInterestRate: obj.LateInterestRate,
                         CloseInterestRate: obj.CloseInterestRate,
                         OverpaymentInterestRate: obj.OverpaymentInterestRate,
                         PaymentTotal: obj.PaymentTotal,
                         PaymentInterval: obj.PaymentInterval,
                         GracePeriod: obj.GracePeriod,
                         LoanSequence: obj.LoanSequence,
                         NextPaymentDueDate: obj.NextPaymentDueDate,
                         PaymentRemaining: obj.PaymentRemaining,
                         PeriodicPayment: obj.PeriodicPayment,
                         PrincipalOutstanding: obj.PrincipalOutstanding,
                         StartDate: obj.StartDate,
                         TotalValueOutstanding: obj.TotalValueOutstanding,
                         Borrower: obj.Borrower,
                         Flags: obj.Flags || 0,
                         owner: obj.Borrower || obj.Account || '',
                         Account: obj.Borrower || obj.Account || '',
                         amountDisplay: `${principalRequested}`,
                         display: `Loan ${loanBrokerId.slice(0, 8)}... - ${principalRequested}`,
                         status: status,
                         remainingBalance: remainingBalance,
                    };
               })
          );

          mapped.sort((a, b) => (a.LoanBrokerID || '').localeCompare(b.LoanBrokerID || ''));
          this.logService.logObjects(`getExistingLoans`, mapped);
          return mapped;
     }

     loanItems(loans: LoanDisplayItem[]): SelectItem[] {
          if (!loans || loans.length === 0) return [];

          return loans.map(loan => {
               const loanId = loan.index || loan.id || '';
               const brokerId = loan.LoanBrokerID || '';
               const shortBrokerId = brokerId.length > 16 ? `${brokerId.slice(0, 8)}...${brokerId.slice(-8)}` : brokerId;
               const principal = loan.PrincipalOutstanding || '0';
               const owner = loan.Borrower || loan.Account || '';
               const shortOwner = owner.length > 12 ? `${owner.slice(0, 6)}...${owner.slice(-6)}` : owner;

               return {
                    id: loanId,
                    label: `Loan ${shortBrokerId} - ${principal}`,
                    secondaryLabel: `Owner: ${shortOwner}`,
                    display: `${principal} (${brokerId})`,
                    brokerId: brokerId,
               };
          });
     }

     selectedLoanItem(items: SelectItem[], selectedLoanId: string | null): SelectItem | null {
          if (!selectedLoanId) return null;
          return items.find(item => item.id === selectedLoanId) || null;
     }

     getLoanById(loans: LoanDisplayItem[], loanId: string): LoanDisplayItem | null {
          return (
               loans.find(loan => {
                    const id = loan.index || loan.id;
                    return id === loanId;
               }) || null
          );
     }

     /**
      * Get the asset type of the vault associated with the selected Loan Broker
      * Returns: 'XRP', 'MPT', 'IOU', or 'Unknown'
      */
     getLoanAssetType(): string {
          // Get the selected Loan Broker ID
          const loanBrokerId = this.loanStoreService.loanBrokerId();
          if (!loanBrokerId) return 'Unknown';

          // Find the Loan Broker
          const brokers = this.loanBrokerStoreService.existingBrokers();
          const broker = brokers.find(b => (b.id || b.index) === loanBrokerId);

          if (!broker) return 'Unknown';

          // Get the Vault ID from the broker
          const vaultId = broker.VaultID;
          if (!vaultId) return 'Unknown';

          // Find the vault
          const vaults = this.vaultStoreService.existingVaults();
          const vault = vaults.find(v => (v.index || v.id) === vaultId);

          if (!vault) return 'Unknown';

          // this.loanStoreService.setField('vault', vault);

          // Determine the asset type from the vault's Asset field
          const asset = vault.Asset || vault.SendMax;

          if (!asset) return 'Unknown';

          if (asset?.currency === 'XRP' || typeof asset === 'string') {
               return 'XRP';
          }

          if (asset?.mpt_issuance_id) {
               return 'MPT';
          }

          if (asset?.currency && asset?.issuer) {
               return 'IOU';
          }

          return 'Unknown';
     }

     /**
      * Get the vault's asset details for display
      */
     getLoanAssetDetails(): { type: string; display: string; issuanceId?: string } {
          const loanBrokerId = this.loanStoreService.loanBrokerId();
          if (!loanBrokerId) return { type: 'Unknown', display: 'Unknown' };

          const brokers = this.loanBrokerStoreService.existingBrokers();
          const broker = brokers.find(b => (b.id || b.index) === loanBrokerId);

          if (!broker) return { type: 'Unknown', display: 'Unknown' };

          const vaultId = broker.VaultID;
          if (!vaultId) return { type: 'Unknown', display: 'Unknown' };

          const vaults = this.vaultStoreService.existingVaults();
          const vault = vaults.find(v => (v.index || v.id) === vaultId);

          if (!vault) return { type: 'Unknown', display: 'Unknown' };

          const asset = vault.Asset || vault.SendMax;

          if (!asset) return { type: 'Unknown', display: 'Unknown' };

          if (asset?.currency === 'XRP' || typeof asset === 'string') {
               return { type: 'XRP', display: 'XRP' };
          }

          if (asset?.mpt_issuance_id) {
               const issuanceId = asset.mpt_issuance_id;
               const shortId = issuanceId.length > 16 ? `${issuanceId.slice(0, 8)}...${issuanceId.slice(-8)}` : issuanceId;
               return {
                    type: 'MPT',
                    display: `MPT (${shortId})`,
                    issuanceId: issuanceId,
               };
          }

          if (asset?.currency && asset?.issuer) {
               const currency = asset.currency;
               const issuer = asset.issuer;
               const shortIssuer = issuer.length > 12 ? `${issuer.slice(0, 6)}...${issuer.slice(-6)}` : issuer;
               return {
                    type: 'IOU',
                    display: `${currency} (${shortIssuer})`,
                    // issuanceId: issuanceId,
               };
          }

          return { type: 'Unknown', display: 'Unknown' };
     }

     /**
      * Get the vault's balance for display
      */
     getVaultBalance(): string {
          const loanBrokerId = this.loanStoreService.loanBrokerId();
          if (!loanBrokerId) return '0';

          const brokers = this.loanBrokerStoreService.existingBrokers();
          const broker = brokers.find(b => (b.id || b.index) === loanBrokerId);

          if (!broker) return '0';

          const vaultId = broker.VaultID;
          if (!vaultId) return '0';

          const vaults = this.vaultStoreService.existingVaults();
          const vault = vaults.find(v => (v.index || v.id) === vaultId);

          if (!vault) return '0';

          return vault.AssetsAvailable || '0';
     }

     /**
      * Get the vault's total assets for display
      */
     getVaultTotalAssets(): string {
          const loanBrokerId = this.loanStoreService.loanBrokerId();
          if (!loanBrokerId) return '0';

          const brokers = this.loanBrokerStoreService.existingBrokers();
          const broker = brokers.find(b => (b.id || b.index) === loanBrokerId);

          if (!broker) return '0';

          const vaultId = broker.VaultID;
          if (!vaultId) return '0';

          const vaults = this.vaultStoreService.existingVaults();
          const vault = vaults.find(v => (v.index || v.id) === vaultId);

          if (!vault) return '0';

          return vault.AssetsTotal || '0';
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

     // Validation methods
     validateLoanBrokerId(value: string): boolean {
          if (!value) return false;
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

     validateInterestRate(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= 0 && value <= MAX_INTEREST_RATE;
     }

     validateLateInterestRate(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= 0 && value <= MAX_LATE_INTEREST_RATE;
     }

     validateCloseInterestRate(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= 0 && value <= MAX_CLOSE_INTEREST_RATE;
     }

     validateOverpaymentInterestRate(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= 0 && value <= MAX_OVER_PAYMENT_INTEREST_RATE;
     }

     validateOverpaymentFee(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= 0 && value <= MAX_OVER_PAYMENT_FEE_RATE;
     }

     validatePaymentInterval(value: number | null): boolean {
          if (value === null || value === undefined) return true;
          return value >= MIN_PAYMENT_INTERVAL;
     }

     validateGracePeriod(value: number | null, paymentInterval: number | null): boolean {
          if (value === null || value === undefined) return true;
          if (paymentInterval === null || paymentInterval === undefined) return true;
          return value <= paymentInterval;
     }

     // Button labels
     readonly createLoanButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Create Loan';
          if (step === 'waiting_validation') return 'Create Loan';
          return this.txUiService.stepMessage();
     });

     readonly modifyLoanButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Modify Loan';
          if (step === 'waiting_validation') return 'Modify Loan';
          return this.txUiService.stepMessage();
     });

     readonly payLoanButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Pay Loan';
          if (step === 'waiting_validation') return 'Pay Loan';
          return this.txUiService.stepMessage();
     });

     readonly defaultLoanButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Default Loan';
          if (step === 'waiting_validation') return 'Default Loan';
          return this.txUiService.stepMessage();
     });

     readonly deleteLoanButtonLabel = computed(() => {
          const step = this.txUiService.currentStep();
          if (step === 'idle') return 'Delete Loan';
          if (step === 'waiting_validation') return 'Delete Loan';
          return this.txUiService.stepMessage();
     });
}
