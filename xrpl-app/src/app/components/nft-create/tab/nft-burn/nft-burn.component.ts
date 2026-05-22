import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, Input, output, Output, signal } from '@angular/core';
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

@Component({
     selector: 'app-nft-burn',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, SelectSearchDropdownComponent, LucideAngularModule, MatSlideToggleModule, NgIcon],
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

     // Helpler info
     readonly nftIdHelperItems = AppConstants.NFT_ID_HELPER_ITEMS;

     // Outputs
     canBurnNftChange = output<boolean>();
     validationErrorsChange = output<string[]>();

     // Signals
     showNftHelper = signal(false);

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canBurnNftChange.emit(this.nftBurnValidatorService.canBurnNft());
               this.validationErrorsChange.emit(this.nftValidatorService.getAllValidationErrors());
          });
     }

     // Destination dropdown – passed from parent (keeps logic in the main page)
     @Input() destinationItems: SelectItem[] = [];
     @Input() selectedDestinationItem: SelectItem | null = null;
     @Input() destinationSearchQuery: string | null = null;
     @Output() destinationChanged = new EventEmitter<SelectItem | null>();
     @Output() optionsToggled = new EventEmitter<boolean>();
     @Output() expirationToggled = new EventEmitter<boolean>();
     @Output() destinationSearchQueryChange = new EventEmitter<string>();
     @Output() destinationValueChange = new EventEmitter<SelectItem | null>();

     onFocus(event: FocusEvent): void {
          const input = event.target as HTMLInputElement;
          if (input.value) {
               const num = Number.parseFloat(input.value);
               if (!Number.isNaN(num)) input.value = num.toFixed(6);
          }
     }

     setNftExpirationDate = (value: string): void => {
          this.nftCreateStoreService.setField('expiration', value);
     };

     onNftSelected(item: SelectItem | null) {
          this.nftCreateStoreService.setField('nftId', item?.id || '');
     }

     toggleNftHelper() {
          this.showNftHelper.update(v => !v);
     }
}
