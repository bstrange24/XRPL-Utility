import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { XrplDateService } from '../../../../core/xrpl-date.service';
import { DownloadUtilService } from '../../../../services/utils/download-util/download-util.service';
import { NftTransactionOrchestrator } from '../../../../services/nft/nft-orchestrator/nft-orchestrator.service';
import { CreateNftStoreService } from '../../../../services/nft/nft-store/nft-store.service';
import { NftTransactionViewModelService } from '../../../../services/nft/nft-transaction-view-model/nft-transaction-view-model.service';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../../../services/trustlines/trustline-currency/trustline-currency.service';
import { TrustlineUtilService } from '../../../../services/trustlines/trustline-utils/trustline-util.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { SelectSearchDropdownComponent, SelectItem } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';
import { UriValidatorService } from '../../../../services/shared/validators/uri-validator/uri-validator.service';
import { NftCreateValidatorService } from '../../../../services/shared/validators/nft/nft-create-validator/nft-create-validator.service';
import { NftValidatorService } from '../../../../services/shared/validators/nft/nft-validator/nft-validator.service';
import { NftModifyValidatorService } from '../../../../services/shared/validators/nft/nft-modify-validator/nft-modify-validator.service';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-nft-modify',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, SelectSearchDropdownComponent, LucideAngularModule, MatSlideToggleModule, NgIcon, ValidationErrorsComponent],
     templateUrl: './nft-modify.component.html',
     styleUrl: './nft-modify.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftModifyComponent {
     public readonly txUiService = inject(TransactionUiService);
     public readonly utilsService = inject(UtilsService);
     public readonly trustlineUtilService = inject(TrustlineUtilService);
     public readonly xrplDateService = inject(XrplDateService);
     public readonly walletManagerService = inject(WalletManagerService);
     public readonly downloadUtilService = inject(DownloadUtilService);
     public readonly trustlineCurrency = inject(TrustlineCurrencyService);
     public readonly nftCreateTransactionViewModelService = inject(NftTransactionViewModelService);
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly nftTransactionOrchestrator = inject(NftTransactionOrchestrator);
     public readonly nftCreateValidator = inject(NftCreateValidatorService);
     public readonly nftValidatorService = inject(NftValidatorService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly nftModifyValidatorService = inject(NftModifyValidatorService);

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canModifyNftChange.emit(this.nftModifyValidatorService.canModifyNft());
               this.validationErrorsChange.emit(this.nftValidatorService.getAllValidationErrors());
          });
     }

     // Helpler info
     readonly transferFeeHelperItems = AppConstants.TRANSFER_FEE_HELPER_ITEMS;
     readonly uriHelperItems = AppConstants.URI_HELPER_ITEMS;
     readonly minterHelperItems = AppConstants.MINTER_HELPER_ITEMS;
     readonly nftOwnerHelperItems = AppConstants.NFT_OWNER_HELPER_ITEMS;
     readonly taxonHelperItems = AppConstants.TAXON_HELPER_ITEMS;
     readonly nftIdHelperItems = AppConstants.NFT_ID_HELPER_ITEMS;
     readonly updateNftHelperItems = AppConstants.UPDATE_NFT_HELPER_ITEMS;

     // Inputs
     readonly destinationItems = input<SelectItem[]>([]);
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly destinationSearchQuery = input<string | null>(null);

     // Outputs
     readonly canModifyNftChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();
     readonly nftSelected = output<any>();
     readonly destinationChanged = output<SelectItem | null>();
     readonly optionsToggled = output<boolean>();
     readonly expirationToggled = output<boolean>();
     readonly destinationSearchQueryChange = output<string>();
     readonly destinationValueChange = output<SelectItem | null>();

     // Signals
     showUriHelper = signal(false);
     showNftOwnerHelper = signal(false);
     showNftHelper = signal(false);
     showUpdateNftHelper = signal(false);

     onNftSelected(item: SelectItem | null) {
          const id = item?.id || '';

          this.nftCreateStoreService.setField('nftId', id);

          if (id) {
               this.nftUtilService.onNftSelectedInUi(item); // reuse the util
          } else {
               // Clear when X is clicked
               this.nftCreateStoreService.setField('initialURI', '');
               this.nftCreateStoreService.setField('nftOwnerAddress', '');
          }

          this.nftSelected.emit(item); // forward to parent if needed
     }

     // For NFT Burn
     selectedNftIsNotBurnable(): boolean {
          return false;
     }

     // For NFT Modify
     selectedNftIsNotMutable(): boolean {
          return false;
     }

     selectedNftOwnerMismatch(): boolean {
          return false;
     }

     toggleNftOwnerHelper() {
          this.showNftOwnerHelper.update(v => !v);
     }

     toggleUriHelper() {
          this.showUriHelper.update(v => !v);
     }

     toggleNftHelper() {
          this.showNftHelper.update(v => !v);
     }

     toggleUpdateNftHelper() {
          this.showUpdateNftHelper.update(v => !v);
     }
}
