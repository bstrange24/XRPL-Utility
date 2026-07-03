import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
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
import { EscrowTransactionViewModelService } from '../../../../services/escrow/escrow-transaction-view-model/escrow-transaction-view-model.service';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { EscrowValidatorService } from '../../../../services/shared/validators/escrow-validator/escrow-validator.service';
import { MptValidatorService } from '../../../../services/shared/validators/mpt/mpt-validator/mpt-validator.service';
import { TagValidatorService } from '../../../../services/shared/validators/tag-validator/tag-validator.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { AppConstants } from '../../../../core/app.constants';
import { UriValidatorService } from '../../../../services/shared/validators/uri-validator/uri-validator.service';
import { VaultStoreService } from '../../../../services/vault/vault-store/vault-store.service';
import { VaultViewModelService } from '../../../../services/vault/vault-view-model/vault-view-model.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { DomainIdValidatorService } from '../../../../services/shared/validators/domain-id-validator/domain-id-validator.service';
import * as xrpl from 'xrpl';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';

@Component({
     selector: 'app-vault-create',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, NgIcon, SelectSearchDropdownComponent, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './vault-create.component.html',
     styleUrl: './vault-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultCreateComponent {
     public readonly escrowStoreService = inject(EscrowStoreService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     public readonly trustlineCurrencyService = inject(TrustlineCurrencyService);
     public readonly mptStoreService = inject(MptStoreService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly transactionDropdownService = inject(TransactionDropdownService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly utilsService = inject(UtilsService);
     public readonly escrowViewModel = inject(EscrowTransactionViewModelService);
     public readonly mptViewModel = inject(MptTransactionViewModelService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public readonly tagValidatorService = inject(TagValidatorService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly escrowValidatorService = inject(EscrowValidatorService);
     public readonly mptValidatorService = inject(MptValidatorService);
     public readonly copyUtilService = inject(CopyUtilService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly vaultStoreService = inject(VaultStoreService);
     public readonly mptValidator = inject(MptValidatorService);
     public readonly vaultViewModelService = inject(VaultViewModelService);
     public readonly permissionedDomainStoreService = inject(PermissionedDomainStoreService);
     public readonly domainIdValidatorService = inject(DomainIdValidatorService);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canCreateVaultChange.emit(this.canCreateVault());
          });

          effect(() => {
               const wantsOptions = this.txUiService.wantsOptions();
               if (!wantsOptions) {
                    // this.escrowStoreService.setEscrowCancelAfterExpirationDate('');
                    // this.escrowStoreService.setEscrowFinishAfterExpirationDate('');
                    // this.xrplTxOptionsStore.setIsExpirationEnabled(false);
               }
          });
     }

     readonly vaultFlagsConfig = [
          { key: 'tfVaultPrivate' as const, title: 'Vault Private', label: 'VaultPrivate', hex: '0x00010000', desc: 'The vault will only be private.' },
          { key: 'tfVaultShareNonTransferable' as const, title: 'Share Non Transferable', label: 'VaultShareNonTransferable', hex: '0x00020000', desc: 'Individual share of the vault cannot be transferred.' },
          { key: 'vaultStrategyFirstComeFirstServe' as const, title: 'First Come First Serve', label: 'vaultStrategyFirstComeFirstServe', hex: '0x0001', desc: 'Requests are processed on a first-come-first-serve basis.' },
     ] as const;

     readonly assetScalePresets = AppConstants.ASSET_SCALE_PRESETS;

     // Helper Items
     readonly escrowCurrencyCodeHelperItems = AppConstants.ESCROW_CURRENCY_CODE_HELPER_ITEMS;
     readonly escrowAmountHelperItems = AppConstants.ESCROW_AMOUNT_HELPER_ITEMS;
     readonly escrowIssuerHelperItems = AppConstants.ESCROW_ISSUER_HELPER_ITEMS;
     readonly escrowMptHelperItems = AppConstants.ESCROW_MPT_HELPER_ITEMS;
     readonly escrowDestinationHelperItems = AppConstants.ESCROW_DESTINATION_HELPER_ITEMS;
     readonly escrowDestTagHelperItems = AppConstants.ESCROW_DEST_TAG_HELPER_ITEMS;
     readonly escrowConditionHelperItems = AppConstants.ESCROW_CONDITION_HELPER_ITEMS;
     readonly escrowFulfillmentHelperItems = AppConstants.ESCROW_FULFILLMENT_HELPER_ITEMS;
     readonly assetScaleHelperItems = AppConstants.ASSET_SCALE_HELPER_ITEMS;
     readonly uriHelperItems = AppConstants.URI_HELPER_ITEMS;
     readonly mptMetadataHelperItems = AppConstants.MPT_META_DATA_HELPER;

     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');
     private readonly optionsErrors = signal<string[]>([]);

     // Inputs from parent
     wantsOptions = input<boolean>(true);
     canSubmit = input<boolean>(false);
     tab = input<string>();
     selectedDestinationAddress = input<string>();
     currentAddress = input<string>('');
     lastIntendedDestination = input<string>('');

     // Outputs to parent
     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     optionsToggled = output<boolean>();
     toggleOptions = output<boolean>();
     // readonly selectedMPT = output<SelectItem | null>();
     canCreateVaultChange = output<boolean>();
     canFinishEscrowChange = output<boolean>();
     canCancelEscrowChange = output<boolean>();

     // Signals
     showUriHelper = signal(false);
     showAssetScaleHelper = signal(false);
     showMptMetadataHelper = signal(false);
     isDestinationValid = signal(false);
     showEscrowCurrencyCodeHelper = signal(false);
     showEscrowAmountHelper = signal(false);
     showEscrowIssuerHelper = signal(false);
     showEscrowMptHelper = signal(false);
     showEscrowDestinationHelper = signal(false);
     showEscrowDestTagHelper = signal(false);
     showEscrowConditionHelper = signal(false);
     showEscrowFulfillmentHelper = signal(false);
     isFocused = signal(false);
     isFocusedAssetScale = signal(false);

     isXRP = computed(() => this.currencyStoreService.currency() === 'XRP');
     isMPT = computed(() => this.currencyStoreService.currency() === 'MPT');
     isIOU = computed(() => {
          const currency = this.currencyStoreService.currency();
          return currency !== 'XRP' && currency !== 'MPT';
     });

     // Show Asset Scale only for IOU
     showAssetScale = computed(() => this.isIOU());

     // Show Token Metadata only for MPT
     showTokenMetadata = computed(() => this.isMPT());

     // Show Issuer only for IOU
     showIssuer = computed(() => this.isIOU());

     // Show MPT selection only for MPT
     showMptSelection = computed(() => this.isMPT());

     // Show MPT fields only when MPT is selected
     showMptFields = computed(() => this.isMPT());

     // Get metadata from selected MPT
     selectedMptMetadata = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return null;

          const mpts = this.mptStoreService.existingMpts() || [];
          const selectedMpt = mpts.find((m: any) => m.mpt_issuance_id === issuanceId);
          if (selectedMpt?.MPTokenMetadata && selectedMpt?.MPTokenMetadata !== '') {
               return xrpl.decodeMPTokenMetadata(selectedMpt?.MPTokenMetadata);
          } else {
               return null;
          }
     });

     selectedMptMetadataLength = computed(() => {
          const metadata = this.selectedMptMetadata();
          if (!metadata) return 0;
          return JSON.stringify(metadata).length;
     });

     public async onCurrencySelected(item: SelectItem | null) {
          const currency = item?.id ?? 'XRP';
          this.trustlineCurrencyService.selectCurrency(currency);
          if (currency === 'MPT') {
               await this.escrowViewModel.refreshMpts();
          } else {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     public async onIssuerSelected(item: SelectItem | null) {
          const address = item?.id || '';
          this.trustlineCurrencyService.selectIssuer(address);
          if (this.currencyStoreService.currency() && address) {
               await this.trustlineUtilService.loadTrustlines(false);
               await this.trustlineCurrencyService.refreshCurrentBalance();
          }
     }

     public currencyItems() {
          return this.trustlineCurrencyService.currencyItems();
     }

     public selectedCurrencyItem() {
          const code = this.currencyStoreService.currency();
          if (!code) return null;
          return this.currencyItems().find(item => item.id === code) || null;
     }

     public issuerItems() {
          return this.trustlineCurrencyService.issuerItems();
     }

     public selectedIssuerItem() {
          const addr = this.currencyStoreService.issuer();
          if (!addr) return null;
          return this.issuerItems().find(item => item.id === addr) || null;
     }

     public mptItems() {
          const mpts = this.mptStoreService.existingMpts?.() || [];
          return this.mptUtilService.computeMptItems(mpts);
     }

     public selectedMptItem() {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          return this.mptUtilService.computeSelectedMptItem(this.mptItems(), issuanceId);
     }

     public destinationItems() {
          return this.escrowViewModel.destinationItems();
     }

     public selectedDestinationItem() {
          return this.escrowViewModel.selectedDestinationItem();
     }

     public destinationSearchQuery() {
          return this.escrowViewModel.destinationSearchQuery();
     }

     public handleSearchQueryChange(query: string) {
          this.escrowViewModel.destinationSearchQuery.set(query);
     }

     public handleDestinationChange(item: SelectItem | null) {
          const addr = item?.id || '';
          this.escrowViewModel.selectedDestinationAddress.set(addr);
          this.escrowStoreService.setField('destination', addr);
     }

     public selectedMPT(item: any) {
          if (!item) {
               this.mptStoreService.setField('mptIssuanceId', '');
               return;
          }

          this.mptStoreService.setField('mptIssuanceId', item.id || '');
     }

     get amount() {
          return this.escrowStoreService.amount();
     }

     set amount(value: string) {
          this.escrowStoreService.setField('amount', value);
     }

     get vaultMetaData() {
          return this.vaultStoreService.vaultMetaData();
     }

     set vaultMetaData(value: string) {
          this.vaultStoreService.setField('vaultMetaData', value);
     }

     get assetScale() {
          return this.vaultStoreService.assetScale();
     }

     set assetScale(value: number) {
          this.vaultStoreService.setField('assetScale', value);
     }

     get domainid() {
          return this.permissionedDomainStoreService.domainId();
     }

     set domainid(value: string) {
          this.permissionedDomainStoreService.setField('domainId', value);
     }

     get metaData() {
          return this.mptStoreService.metaData();
     }

     set metaData(value: string) {
          this.mptStoreService.setField('metaData', value);
     }

     onMetadataChanged(newMetadata: string) {
          this.mptStoreService.setField('metaData', newMetadata.trim());
     }

     public onFocus(event: Event) {
          (event.target as HTMLInputElement).select?.();
     }

     onOptionsToggled(enabled: boolean) {
          this.txUiService.toggleOptions(enabled);
          this.optionsToggled.emit(enabled);
     }

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     selectFlag(key: 'tfVaultPrivate' | 'tfVaultShareNonTransferable' | 'vaultStrategyFirstComeFirstServe'): void {
          if (key === 'vaultStrategyFirstComeFirstServe') {
               // Independent toggle
               this.vaultStoreService.setField('vaultStrategyFirstComeFirstServe', !this.vaultStoreService.vaultStrategyFirstComeFirstServe());
          } else {
               // Vault Private + Share Non Transferable logic
               const isCurrentlySelected = this.vaultStoreService[key]();

               // Reset both
               this.vaultStoreService.setField('tfVaultPrivate', false);
               this.vaultStoreService.setField('tfVaultShareNonTransferable', false);

               // If it was already selected → we are deselecting (leave both false)
               if (!isCurrentlySelected) {
                    this.vaultStoreService.setField(key, true);
               }
          }
     }

     onMptSelection(item: SelectItem | null) {
          if (!item?.id) {
               this.mptStoreService.setField('mptIssuanceId', '');
               return;
          }
          // this.selectedMPT.emit(item);
     }

     canCreateVault = computed(() => {
          const destAddr = this.escrowViewModel.selectedDestinationAddress?.() ?? '';
          const amountStr = this.escrowStoreService.amount()?.trim() ?? '';
          const isDestinationValid = this.isDestinationValid();
          const amountValid = !this.amountValidatorService.isEscrowAmountInvalid();

          if (!destAddr || !isDestinationValid) {
               return false;
          }
          if (!amountStr || !amountValid) {
               return false;
          }

          const wantsOptions = this.txUiService.wantsOptions();
          const optionsError = this.optionsHasError();

          if (wantsOptions && optionsError) {
               return false;
          }

          return true;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];
          const destAddr = this.escrowViewModel.selectedDestinationAddress?.() ?? '';
          const amountStr = this.escrowStoreService.amount()?.trim() ?? '';

          if (destAddr && !this.isDestinationValid()) errors.push('Destination address is invalid.');

          if (amountStr) {
               const err = this.escrowValidatorService.getAmountErrorMessage();
               if (err) errors.push(err);
          }

          // if (this.escrowValidatorService.hasMissingFinishAfter()) {
          //      errors.push('Finish After is enabled but no date is set.');
          // }

          // if (this.escrowValidatorService.hasMissingCancelAfter()) {
          //      errors.push('Cancel After is enabled but no date is set.');
          // }

          // if (this.escrowStoreService.enableEscrowFinishAfterExpirationDate() && this.escrowValidatorService.hasInvalidEscrowFinishAfterExpiration()) {
          //      errors.push(this.escrowValidatorService.getFinishAfterErrorMessage());
          // }
          // if (this.escrowStoreService.enableEscrowCancelAfterExpirationDate() && this.escrowValidatorService.hasInvalidEscrowCancelAfterExpiration()) {
          //      errors.push(this.escrowValidatorService.getCancelAfterErrorMessage());
          // }

          if (this.txUiService.wantsOptions() && this.optionsHasError()) {
               errors.push(...this.optionsErrors());
          }

          return errors;
     });

     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     hasAnyOptionEnabled = computed(() => this.xrplTxOptionsStore.isMemoEnabled() || this.xrplTxOptionsStore.useMultiSign() || this.xrplTxOptionsStore.isRegularKeyAddress() || this.xrplTxOptionsStore.isTicket() || this.xrplTxOptionsStore.isSimulateEnabled());

     onDestinationValidationChange(isValid: boolean) {
          this.isDestinationValid.set(isValid);
     }

     toggleCurrencyCodeHelper() {
          this.showEscrowCurrencyCodeHelper.set(!this.showEscrowCurrencyCodeHelper());
     }

     toggleAmountHelper() {
          this.showEscrowAmountHelper.set(!this.showEscrowAmountHelper());
     }

     toggleIssuerHelper() {
          this.showEscrowIssuerHelper.set(!this.showEscrowIssuerHelper());
     }

     toggleMptHelper() {
          this.showEscrowMptHelper.set(!this.showEscrowMptHelper());
     }

     toggleDestinationHelper() {
          this.showEscrowDestinationHelper.set(!this.showEscrowDestinationHelper());
     }

     toggleDestinationTagHelper() {
          this.showEscrowDestTagHelper.set(!this.showEscrowDestTagHelper());
     }

     toggleConditionHelper() {
          this.showEscrowConditionHelper.set(!this.showEscrowConditionHelper());
     }

     toggleFulfillmentHelper() {
          this.showEscrowFulfillmentHelper.set(!this.showEscrowFulfillmentHelper());
     }

     toggleUriHelper() {
          this.showUriHelper.update(v => !v);
     }

     toggleAssetScaleHelper() {
          this.showAssetScaleHelper.set(!this.showAssetScaleHelper());
     }

     setPresetAssetScale(scale: number) {
          this.vaultStoreService.setField('assetScale', scale);
     }

     toggleMptMetadataHelper() {
          this.showMptMetadataHelper.update(v => !v);
     }

     clearField(field: 'assetScale') {
          this.vaultStoreService.setField(field, null as any);
     }
}
