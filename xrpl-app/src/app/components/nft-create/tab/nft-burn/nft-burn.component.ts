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
import { LucideAngularModule } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';
import { NftCreateValidatorService } from '../../../../services/shared/validators/nft/nft-create-validator/nft-create-validator.service';
import { NftValidatorService } from '../../../../services/shared/validators/nft/nft-validator/nft-validator.service';
import { NftBurnValidatorService } from '../../../../services/shared/validators/nft/nft-burn-validator/nft-burn-validator.service';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-nft-burn',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, SelectSearchDropdownComponent, LucideAngularModule, MatSlideToggleModule, NgIcon, ValidationErrorsComponent],
     templateUrl: './nft-burn.component.html',
     styleUrl: './nft-burn.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NftBurnComponent {
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
     public readonly nftBurnValidatorService = inject(NftBurnValidatorService);

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canBurnNftChange.emit(this.nftBurnValidatorService.canBurnNft());
               this.validationErrorsChange.emit(this.nftValidatorService.getAllValidationErrors());
          });
     }

     // Helpler info
     readonly nftIdHelperItems = AppConstants.NFT_ID_HELPER_ITEMS;
     readonly selectNftHelperItems = AppConstants.NFT_SELECT_HELPER_ITEMS;

     // Inputs
     readonly destinationItems = input<SelectItem[]>([]);
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly destinationSearchQuery = input<string | null>(null);

     // Outputs
     readonly canBurnNftChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();
     readonly nftSelected = output<any>();
     readonly destinationChanged = output<SelectItem | null>();
     readonly optionsToggled = output<boolean>();
     readonly expirationToggled = output<boolean>();
     readonly destinationSearchQueryChange = output<string>();
     readonly destinationValueChange = output<SelectItem | null>();

     // Signals
     showSelectNftHelper = signal(false);
     showNftHelper = signal(false);

     onNftSelected(item: SelectItem | null) {
          const id = item?.id || '';

          this.nftCreateStoreService.setField('nftId', id);

          if (id) {
               this.nftUtilService.onNftSelectedInUi(item);
          } else {
               this.nftCreateStoreService.setField('initialURI', '');
               this.nftCreateStoreService.setField('nftOwnerAddress', '');
          }

          this.nftSelected.emit(item);
     }

     toggleNftHelper() {
          this.showNftHelper.update(v => !v);
     }

     toggleSelectNftHelper() {
          this.showSelectNftHelper.update(v => !v);
     }
}
