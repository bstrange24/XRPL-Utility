import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { CurrencyStoreService } from '../../../../services/currency/currency-store/currency-store.service';
import { EscrowStoreService } from '../../../../services/escrow/escrow-store/escrow-store.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { EscrowValidatorService } from '../../../../services/shared/validators/escrow-validator/escrow-validator.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { AppConstants } from '../../../../core/app.constants';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';
import { VaultViewModelService } from '../../../../services/vault/vault-view-model/vault-view-model.service';
import { VaultUtilService } from '../../../../services/vault/vault-util/vault-util.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { AccountConfiguratorStoreService } from '../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { VaultDepositValidatorService } from '../../../../services/vault/vault-deposit-validator/vault-deposit-validator.service';
import * as xrpl from 'xrpl';
import { ToastService } from '../../../../services/utils/toast/toast.service';
import { TxEnvironmentService } from '../../../../services/transaction-environment/tx-environment.service';
import { XrplCacheService } from '../../../../services/xrpl-cache/xrpl-cache.service';
import { VaultCacheService } from '../../../../services/vault/vault-cache/vault-cache.service';
import { XrplService } from '../../../../services/xrpl-services/xrpl.service';

@Component({
     selector: 'app-vault-deposit-withdraw',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './vault-deposit-withdrawl.component.html',
     styleUrl: './vault-deposit-withdrawl.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultDepositWithdrawComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly utilsService = inject(UtilsService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly escrowValidatorService = inject(EscrowValidatorService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly vaultViewModelService = inject(VaultViewModelService);
     public readonly vaultUtilService = inject(VaultUtilService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);
     public readonly vaultDepositValidator = inject(VaultDepositValidatorService);
     public readonly toastService = inject(ToastService);
     private readonly xrplCacheService = inject(XrplCacheService);
     private readonly txEnvironmentService = inject(TxEnvironmentService);
     private readonly vaultCacheService = inject(VaultCacheService);
     private readonly xrplService = inject(XrplService);

     // Helper Items
     readonly vaultActionHelperItems = AppConstants.VAULT_ACTION_HELPER_ITEMS;
     readonly vaultSelectorHelperItems = AppConstants.VAULT_SELECTOR_HELPER_ITEMS;
     readonly vaultAmountHelperItems = AppConstants.VAULT_AMOUNT_HELPER_ITEMS;
     readonly vaultDestinationHelperItems = AppConstants.VAULT_DESTINATION_HELPER_ITEMS;

     // UI Signals
     showVaultActionHelper = signal(false);
     showVaultSelectorHelper = signal(false);
     showVaultAmountHelper = signal(false);
     showVaultDestinationHelper = signal(false);
     isFocused = signal(false);
     isDestinationValid = signal(false);
     // manualVaultId = signal<string>('');

     // Add a loading state
     isLoadingVault = signal(false);
     vaultFetchError = signal<string | null>(null);

     // === TOUCHED/DIRTY STATE TRACKING ===
     private isVaultSelectorTouched = signal(false);
     private isAmountTouched = signal(false);
     private isDestinationTouched = signal(false);
     private isFormDirty = signal(false);
     private isActionSelected = signal(false);
     isMptAuthorized = signal<boolean | null>(null);

     // Inputs from parent
     readonly currentAddress = input<string>('');
     readonly lastIntendedDestination = input<string>('');
     readonly destinationSearchQuery = input<string>('');

     // Outputs to parent
     readonly canDepositWithdrawChange = output<boolean>();
     readonly searchQueryChange = output<string>();
     readonly destinationChange = output<any>();
     readonly performAction = output<void>();
     readonly clearFields = output<void>();

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canDepositWithdrawChange.emit(this.canDepositWithdraw());
          });

          effect(() => {
               const address = this.currentAddress();
               if (address) {
                    this.vaultCacheService.setWalletAddress(address);
               }
          });
     }

     public get activeTab() {
          return this.vaultViewModelService.activeTab();
     }

     // Helper method for parseFloat in template
     public parseFloat(value: any): number {
          return parseFloat(value);
     }

     // Vault Action
     get vaultAction() {
          return this.vaultStoreService.vaultAction();
     }

     setVaultAction(action: 'deposit' | 'withdraw') {
          this.isActionSelected.set(true);
          this.isFormDirty.set(true);
          this.vaultStoreService.setField('vaultAction', action);
          // Clear related fields when switching
          this.vaultStoreService.setField('vaultAmount', '');
          if (action === 'deposit') {
               this.vaultStoreService.setField('destination', '');
          }
     }

     isVaultIdValid(): boolean {
          const id = this.vaultStoreService.manualVaultId();
          if (!id) return false;
          if (!/^[0-9A-Fa-f]+$/.test(id)) return false;
          if (id.length < 10) return false;

          const allVaults = this.vaultStoreService.existingVaults() || [];
          const exists = allVaults.some((v: any) => {
               const vaultId = v.index || v.id;
               return vaultId === id;
          });

          return exists || this.vaultStoreService.selectedVaultId() === id;
     }

     isVaultIdInvalid(): boolean {
          const id = this.vaultStoreService.manualVaultId();
          if (!id) return false;
          return !this.isVaultIdValid();
     }

     async onManualVaultIdChange(value: string) {
          this.vaultStoreService.setField('manualVaultId', value);
          this.vaultFetchError.set(null);
          this.isVaultSelectorTouched.set(true);
          this.isFormDirty.set(true);

          // Clear selection if empty
          if (!value || value.trim().length === 0) {
               this.vaultStoreService.setField('selectedVaultId', null);
               this.vaultStoreService.setField('selectedVaultSequence', null);
               this.vaultStoreService.setField('vaultAmount', '');
               this.vaultStoreService.setField('manuallyFetchedVault', null);
               return;
          }

          // Validate hex format
          if (!/^[0-9A-Fa-f]+$/.test(value)) {
               this.vaultFetchError.set('Invalid Vault ID format - must be hexadecimal');
               return;
          }

          // Minimum length for a vault ID
          if (value.length < 10) {
               return;
          }

          this.isLoadingVault.set(true);

          try {
               // First, check if it's in the local cache (vaults owned by this wallet)
               const allVaults = this.vaultStoreService.existingVaults() || [];
               let vault = allVaults.find((v: any) => {
                    const vaultId = String(v.index || v.id || '');
                    return vaultId === value;
               });

               // If not found locally, fetch from ledger
               if (!vault) {
                    const env = await this.txEnvironmentService.getValidatedEnvironment(false);
                    if (!env?.client) {
                         this.vaultFetchError.set('Unable to connect to network');
                         this.isLoadingVault.set(false);
                         return;
                    }

                    const result = await this.xrplCacheService.getVaultInfo(env.client, value);

                    if (!result) {
                         this.vaultFetchError.set('Vault not found on ledger');
                         this.isLoadingVault.set(false);
                         return;
                    }

                    // Check if vault is private
                    const isPrivate = (result.result.vault.Flags & 0x00010000) !== 0;
                    const owner = result.result.vault.Owner || result.result.vault.Account;
                    const currentAddress = this.currentAddress();

                    if (isPrivate && owner !== currentAddress) {
                         this.vaultFetchError.set('This vault is private and you are not the owner');
                         this.isLoadingVault.set(false);
                         return;
                    }

                    // Store the manually fetched vault separately - NOT in existingVaults
                    const vaultItem = this.mapLedgerVaultToDisplayItem(result.result.vault);
                    if (vaultItem) {
                         const vaultId = String(vaultItem.index || vaultItem.id || '');
                         this.vaultCacheService.setVault(vaultId, vaultItem);

                         // Store in a separate field
                         this.vaultStoreService.setField('manuallyFetchedVault', vaultItem);
                         vault = vaultItem;
                    } else {
                         this.vaultFetchError.set('Failed to parse vault data');
                         this.isLoadingVault.set(false);
                         return;
                    }
               }

               // Success - set the selected vault
               if (vault) {
                    const vaultId = String(vault.index || vault.id || '');
                    this.vaultStoreService.setField('selectedVaultId', vaultId);
                    this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence || vault.Sequence);
                    this.vaultFetchError.set(null);

                    // Check MPT authorization if applicable
                    const asset = vault.Asset || vault.SendMax;
                    if (asset?.mpt_issuance_id) {
                         await this.checkMptAuthorizationStatus();
                    }
               }
          } catch (error: any) {
               console.error('Error fetching vault:', error);
               this.vaultFetchError.set(error.message || 'Failed to fetch vault details');
          } finally {
               this.isLoadingVault.set(false);
          }
     }

     private mapLedgerVaultToDisplayItem(vault: any): any {
          try {
               const asset = vault.Asset || vault.SendMax;
               const maxAmount = this.parseAssetsMaximum(vault.AssetsMaximum);
               const assetsAvailable = this.parseAssetsMaximum(vault.AssetsAvailable);
               const assetsTotal = this.parseAssetsMaximum(vault.AssetsTotal);

               return {
                    id: vault.index || vault.id || '',
                    index: vault.index || vault.id || '',
                    VaultSequence: vault.VaultSequence || vault.Sequence || 0,
                    Sequence: vault.Sequence || 0,
                    amount: maxAmount,
                    owner: vault.Owner || vault.Account || '',
                    Account: vault.Owner || vault.Account || '',
                    Asset: asset,
                    AssetsMaximum: vault.AssetsMaximum,
                    AssetsAvailable: assetsAvailable,
                    AssetsTotal: assetsTotal,
                    Flags: vault.Flags || 0,
                    Shares: vault.shares || vault.Shares || [],
                    shareMPTID: vault.ShareMPTID || '',
                    DomainID: vault.DomainID || '',
                    Data: vault.Data || '',
               };
          } catch (error) {
               console.error('Error mapping vault:', error);
               return null;
          }
     }

     private parseAssetsMaximum(assetsMaximum: any): string {
          if (!assetsMaximum) return '0';
          if (typeof assetsMaximum === 'string') {
               return assetsMaximum;
          }
          if (typeof assetsMaximum === 'number') {
               return assetsMaximum.toString();
          }
          if (assetsMaximum?.value) {
               return assetsMaximum.value;
          }
          return '0';
     }

     public vaultItems() {
          // Only use existing vaults from account objects, NOT manually fetched
          const allVaults = this.vaultStoreService.existingVaults() || [];
          const action = this.vaultStoreService.vaultAction();
          const currentAddress = this.walletManagerService.getSelectedWallet()?.address || '';

          if (action === 'deposit') {
               return this.vaultUtilService.vaultItemsForDeposit(allVaults);
          } else {
               const holderVaults = allVaults.filter(vault => {
                    if (vault.Shares && Array.isArray(vault.Shares)) {
                         return vault.Shares.some((share: any) => share.Holder === currentAddress || share.Account === currentAddress);
                    }
                    const owner = vault.owner || vault.Account || vault.Owner;
                    return owner === currentAddress;
               });
               return this.vaultUtilService.vaultItemsForDeposit(holderVaults);
          }
     }

     public selectedVaultItem() {
          const selectedId = this.vaultStoreService.selectedVaultId();
          if (!selectedId) return null;

          // First check in dropdown items (which only has existing vaults)
          const items = this.vaultItems();
          let item = items.find(item => item.id === selectedId);

          // If not found, check manually fetched vault
          if (!item) {
               const manuallyFetched = this.vaultStoreService.manuallyFetchedVault();
               if (manuallyFetched) {
                    const vaultId = String(manuallyFetched.index || manuallyFetched.id || '');
                    if (vaultId === selectedId) {
                         const asset = manuallyFetched.Asset || manuallyFetched.SendMax;
                         const amount = this.vaultUtilService.formatVaultAmount(asset, manuallyFetched.AssetsMaximum);
                         const owner = manuallyFetched.owner || manuallyFetched.Account || '';
                         const shortOwner = owner.length > 12 ? `${owner.slice(0, 6)}...${owner.slice(-6)}` : owner;

                         return {
                              id: vaultId,
                              label: `Vault ${vaultId.slice(0, 8)}... - ${amount}`,
                              secondaryLabel: `Owner: ${shortOwner}`,
                              display: `${amount} (${shortOwner})`,
                         };
                    }
               }
          }

          return item || null;
     }

     public getSelectedVault() {
          const selectedId = this.vaultStoreService.selectedVaultId();
          if (!selectedId) return null;

          // 1. Check existing vaults (owned by this wallet)
          const vaults = this.vaultStoreService.existingVaults();
          let vault = vaults?.find((v: any) => {
               const vaultId = String(v.index || v.id || '');
               return vaultId === selectedId;
          });

          // 2. If not found, check manually fetched vault
          if (!vault) {
               vault = this.vaultStoreService.manuallyFetchedVault();
          }

          // 3. If still not found, check cached vaults
          if (!vault) {
               vault = this.vaultCacheService.getVault(selectedId);
          }

          return vault || null;
     }

     public onVaultSelected(item: SelectItem | null) {
          this.isVaultSelectorTouched.set(true);
          this.isFormDirty.set(true);

          if (!item?.id) {
               this.vaultStoreService.setField('selectedVaultId', null);
               this.vaultStoreService.setField('selectedVaultSequence', null);
               this.vaultStoreService.setField('vaultAmount', '');
               return;
          }

          // Search in all vaults (not filtered)
          const allVaults = this.vaultStoreService.existingVaults() || [];
          const vault = allVaults.find((v: any) => {
               const vaultId = v.index || v.id;
               return vaultId?.toString() === item.id;
          });

          if (vault) {
               const vaultId = vault.index || vault.id;
               this.vaultStoreService.setField('selectedVaultId', vaultId);
               this.vaultStoreService.setField('selectedVaultSequence', vault.VaultSequence || vault.Sequence);

               // Reset fields
               this.vaultStoreService.setField('vaultAmount', '');
               this.vaultStoreService.setField('destination', '');
          }
     }

     // Getters for selected vault details
     public selectedVaultOwner(): string {
          const vault = this.getSelectedVault();
          return vault?.owner || vault?.Account || '';
     }

     public selectedVaultTotalAssets(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'N/A';

          const total = vault.AssetsTotal || '0';
          const asset = vault.Asset || vault.SendMax;

          if (asset?.currency === 'XRP') {
               return `${total} XRP`;
          } else if (asset?.mpt_issuance_id) {
               return `${total} MPT`;
          } else if (asset?.currency && asset?.issuer) {
               const currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               return `${total} ${currency}`;
          }
          return total;
     }

     public selectedVaultAvailableBalance(): string {
          const vault = this.getSelectedVault();
          if (!vault) return '0';

          const total = parseFloat(vault.AssetsTotal || '0');
          const withdrawn = parseFloat(vault.AssetsWithdrawn || '0');
          return (total - withdrawn).toString();
     }

     public selectedVaultMaximumAmount(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'N/A';

          const max = vault.AssetsMaximum || vault.AssetsMaximum || '0';
          const asset = vault.Asset || vault.SendMax;

          if (asset?.currency === 'XRP') {
               return `${max} XRP`;
          } else if (asset?.mpt_issuance_id) {
               return `${max} MPT`;
          } else if (asset?.currency && asset?.issuer) {
               const currency = this.utilsService.normalizeCurrencyCode(asset.currency);
               return `${max} ${currency}`;
          }
          return max;
     }

     public selectedVaultAvailableSpace(): string {
          const vault = this.getSelectedVault();
          if (!vault) return '0';

          const max = parseFloat(vault.AssetsMaximum || '0');
          const total = parseFloat(vault.AssetsTotal || '0');
          return (max - total).toString();
     }

     public getAssetType(): string {
          const vault = this.getSelectedVault();
          if (!vault) return 'Unknown';
          const asset = vault.Asset || vault.SendMax;
          if (!asset) return 'Unknown';

          if (asset?.currency === 'XRP') return 'XRP';
          if (asset?.mpt_issuance_id) return 'MPT';
          if (asset?.currency && asset?.issuer) return 'IOU';
          if (typeof asset === 'string') return 'XRP';
          return 'Unknown';
     }

     public getAssetDetails(): { currency: string; issuer: string; mptId: string } {
          const vault = this.getSelectedVault();
          if (!vault) return { currency: '', issuer: '', mptId: '' };
          const asset = vault.Asset || vault.SendMax;
          if (!asset) return { currency: '', issuer: '', mptId: '' };

          if (asset?.currency === 'XRP') {
               return { currency: 'XRP', issuer: '', mptId: '' };
          }
          if (asset?.mpt_issuance_id) {
               return { currency: 'MPT', issuer: '', mptId: asset.mpt_issuance_id };
          }
          if (asset?.currency && asset?.issuer) {
               return { currency: asset.currency, issuer: asset.issuer, mptId: '' };
          }
          return { currency: '', issuer: '', mptId: '' };
     }

     // Form field accessors
     get vaultAmount() {
          return this.vaultStoreService.vaultAmount();
     }

     set vaultAmount(value: string) {
          this.isAmountTouched.set(true);
          this.isFormDirty.set(true);
          this.vaultStoreService.setField('vaultAmount', value);
     }

     // Handle destination change locally
     public onDestinationChange(item: SelectItem | null) {
          this.isDestinationTouched.set(true);
          this.isFormDirty.set(true);

          if (!item) {
               this.vaultStoreService.setField('destination', '');
               this.vaultViewModelService.selectedDestinationAddress.set('');
               this.destinationChange.emit(null);
               return;
          }

          const addr = item?.id || '';
          this.vaultStoreService.setField('destination', addr);
          this.vaultViewModelService.selectedDestinationAddress.set(addr);
          this.destinationChange.emit(item);
     }

     // Update the search query
     public onSearchQueryChange(query: string) {
          this.vaultViewModelService.destinationSearchQuery.set(query);
          this.searchQueryChange.emit(query);
     }

     // Amount validation
     isAmountValid(): boolean {
          const amount = this.vaultAmount;
          if (!amount) return false;
          return !this.amountValidatorService.isEscrowAmountInvalid();
     }

     isAmountInvalid(): boolean {
          const amount = this.vaultAmount;
          if (!amount) return false;
          return this.amountValidatorService.isEscrowAmountInvalid();
     }

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
          if (isValid) {
               this.isDestinationTouched.set(true);
          }
     }

     get destinationItems() {
          return this.vaultViewModelService.destinationItems();
     }

     get selectedDestinationItem() {
          return this.vaultViewModelService.selectedDestinationItem();
     }

     public onDestinationItemSelected(item: SelectItem | null) {
          if (!item) {
               this.vaultStoreService.setField('destination', '');
               this.vaultViewModelService.selectedDestinationAddress.set('');
               return;
          }

          const addr = item.id;
          if (addr && xrpl.isValidAddress(addr)) {
               this.vaultStoreService.setField('destination', addr);
               this.vaultViewModelService.selectedDestinationAddress.set(addr);
               this.destinationChange.emit(item);
          }
     }

     async authorizeMpt() {
          const selectedVault = this.getSelectedVault();
          if (!selectedVault) return;

          const asset = selectedVault.Asset || selectedVault.SendMax;
          if (!asset?.mpt_issuance_id) return;

          try {
               const client = await this.xrplService.getClient();
               const wallet = this.walletManagerService.getSelectedWallet();
               if (!wallet) {
                    this.toastService.error('No wallet selected', AppConstants.TOAST.ERROR);
                    return;
               }
               // // Build and submit MPTokenAuthorize transaction
               // const tx: xrpl.MPTokenAuthorize = {
               //      TransactionType: 'MPTokenAuthorize',
               //      Account: wallet.address,
               //      MPTokenIssuanceID: asset.mpt_issuance_id,
               //      MPTokenAuthorize: wallet.address,
               //      Fee: '12',
               //      LastLedgerSequence: await this.getLastLedgerSequence(client),
               // };
               // const result = await this.xrplTransactionOrchestratorService.executeTx({
               //      client,
               //      wallet,
               //      env: await this.txEnvironmentService.prepareTxEnvironment({}),
               //      mode: 'submit',
               //      signing: {
               //           // ... signing config
               //      },
               //      buildTx: () => tx as any,
               // });
               // if (result.success) {
               //      this.toastService.success('MPT authorized successfully!', AppConstants.TOAST.SUCCESS);
               //      await this.checkMptAuthorizationStatus();
               // } else {
               //      this.toastService.error('Failed to authorize MPT', AppConstants.TOAST.ERROR);
               // }
          } catch (error: any) {
               console.error('Failed to authorize MPT:', error);
               this.toastService.error(error.message || 'Failed to authorize MPT', AppConstants.TOAST.ERROR);
          }
     }

     async validateMptAuthorization(client: xrpl.Client): Promise<boolean> {
          const selectedVault = this.getSelectedVault();
          if (!selectedVault) return false;

          const asset = selectedVault.Asset || selectedVault.SendMax;

          // Check if the asset is an MPT
          if (!asset?.mpt_issuance_id) {
               // Not an MPT - no authorization needed
               return true;
          }

          const mptIssuanceId = asset.mpt_issuance_id;
          const currentAddress = this.currentAddress();

          // Check if the wallet is authorized to hold this MPT
          return await this.vaultUtilService.checkMptAuthorization(client, mptIssuanceId, currentAddress);
     }

     async checkMptAuthorizationStatus() {
          const selectedVault = this.getSelectedVault();
          if (!selectedVault) return;

          const asset = selectedVault.Asset || selectedVault.SendMax;
          if (!asset?.mpt_issuance_id) {
               this.isMptAuthorized.set(null);
               return;
          }

          const wallet = this.walletManagerService.getSelectedWallet();
          if (wallet?.address === selectedVault.owner) {
               this.isMptAuthorized.set(true);
               return;
          }

          try {
               const client = await this.xrplService.getClient(); // Get client
               const authorized = await this.vaultUtilService.checkMptAuthorization(client, asset.mpt_issuance_id, this.currentAddress());
               this.isMptAuthorized.set(authorized);
          } catch (error) {
               console.error('Failed to check MPT authorization:', error);
               this.isMptAuthorized.set(false);
          }
     }

     // Validation
     canDepositWithdraw = computed(() => {
          const hasVaultSelected = !!this.vaultStoreService.selectedVaultId();
          if (!hasVaultSelected) return false;

          const amount = this.vaultStoreService.vaultAmount();
          if (!amount || amount.trim().length === 0) return false;

          if (this.amountValidatorService.isEscrowAmountInvalid()) {
               return false;
          }

          const action = this.vaultStoreService.vaultAction();
          const amountNum = parseFloat(amount);

          if (action === 'deposit') {
               // For deposit, no holder needed - the sender is the holder
               // Check if amount exceeds available space
               const availableSpace = parseFloat(this.selectedVaultAvailableSpace());
               if (!isNaN(availableSpace) && amountNum > availableSpace) {
                    return false;
               }
          } else {
               // For withdrawal, destination is required
               const hasDestination = !!this.vaultStoreService.destination() && this.isDestinationValid();
               if (!hasDestination) return false;

               // Check if amount exceeds available balance
               const availableBalance = parseFloat(this.selectedVaultAvailableBalance());
               if (!isNaN(availableBalance) && amountNum > availableBalance) {
                    return false;
               }
          }

          return true;
     });

     // Updated validation with touched/dirty state
     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Only show vault selection error if touched
          if (this.isVaultSelectorTouched() && !this.vaultStoreService.selectedVaultId()) {
               errors.push('Please select a vault.');
          }

          // Only show amount errors if touched
          if (this.isAmountTouched()) {
               const amount = this.vaultStoreService.vaultAmount();
               if (!amount || amount.trim().length === 0) {
                    errors.push('Please enter an amount.');
               } else if (this.amountValidatorService.isEscrowAmountInvalid()) {
                    errors.push('Invalid amount format.');
               } else {
                    const action = this.vaultStoreService.vaultAction();
                    const amountNum = parseFloat(amount);

                    if (action === 'deposit') {
                         const availableSpace = parseFloat(this.selectedVaultAvailableSpace());
                         if (!isNaN(availableSpace) && amountNum > availableSpace) {
                              errors.push(`Amount exceeds available space of ${this.selectedVaultAvailableSpace()}.`);
                         }
                    } else {
                         const availableBalance = parseFloat(this.selectedVaultAvailableBalance());
                         if (!isNaN(availableBalance) && amountNum > availableBalance) {
                              errors.push(`Amount exceeds available balance of ${this.selectedVaultAvailableBalance()}.`);
                         }
                    }
               }
          }

          // Only show destination errors if touched and action is withdraw
          if (this.isDestinationTouched() && this.vaultStoreService.vaultAction() === 'withdraw') {
               if (!this.vaultStoreService.destination() || !this.isDestinationValid()) {
                    errors.push('Please enter a valid destination address.');
               }
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle helper methods
     toggleActionHelper() {
          this.showVaultActionHelper.set(!this.showVaultActionHelper());
     }

     toggleVaultSelectorHelper() {
          this.showVaultSelectorHelper.set(!this.showVaultSelectorHelper());
     }

     toggleAmountHelper() {
          this.showVaultAmountHelper.set(!this.showVaultAmountHelper());
     }

     toggleDestinationHelper() {
          this.showVaultDestinationHelper.set(!this.showVaultDestinationHelper());
     }

     clearField(field: 'vaultAmount' | 'vaultAction') {
          if (field === 'vaultAmount') {
               this.vaultStoreService.setField('vaultAmount', '');
          } else if (field === 'vaultAction') {
               this.vaultStoreService.setField('vaultAction', 'deposit');
          }
     }

     // Reset validation state when component initializes or tab changes
     resetValidationState() {
          this.isVaultSelectorTouched.set(false);
          this.isAmountTouched.set(false);
          this.isDestinationTouched.set(false);
          this.isFormDirty.set(false);
          this.isActionSelected.set(false);
     }
}
