import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { LucideAngularModule } from 'lucide-angular';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { WalletDestinationBase } from '../../../../services/wallets/walletDestinationBase';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { WalletDataService } from '../../../../services/wallets/refresh-wallet/refresh-wallets.service';
import { TxEnvironmentService } from '../../../../services/transaction-environment/tx-environment.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { ToastService } from '../../../../services/utils/toast/toast.service';
import { AcccountDataService } from '../../../../services/account-data/acccount-data.service';
import { StorageService } from '../../../../services/shared/local-storage/storage.service';
import { ActivatedRoute } from '@angular/router';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';
import { AppConstants } from '../../../../core/app.constants';
import { DialogService } from '../../../../services/shared/dialog/dialog.service';
import { ButtonTooltipComponent } from '../../../shared/button-tooltip/button-tooltip.component';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';

@Component({
     selector: 'app-wallet-remove-custom-wallet',
     standalone: true,
     imports: [CommonModule, FormsModule, SelectSearchDropdownComponent, FieldHelperComponent, LucideAngularModule, OverlayModule, ButtonTooltipComponent, FocusBorderDirective],
     templateUrl: './wallet-remove-custom-wallet.component.html',
     styleUrl: './wallet-remove-custom-wallet.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletRemoveCustomWalletComponent extends WalletDestinationBase {
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);
     public readonly WalletConfiguratorComponent = inject(WalletConfiguratorComponent);
     private readonly dialogService = inject(DialogService);
     typedDestination = signal<string>('');

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
     }

     onCustomWalletSelected(event: any) {
          let address: string | undefined;

          if (typeof event === 'string') {
               address = event;
          } else if (event && typeof event === 'object') {
               address = event.id ?? event.address ?? event.value;
          }

          if (address?.trim()) {
               const trimmed = address.trim();
               this.walletsStoreService.setField('selectedAddress', trimmed);
          }
     }

     readonly customOnlyItems = computed(() => {
          const customWallets = this.transactionDropdownService.customDestinations().map(dest => ({
               id: dest.address,
               display: dest.name + ' (' + this.walletsUtilService.truncateAddress(dest.address) + ')', // ← must be 'display'
               name: dest.name,
               address: dest.address,
          }));
          return customWallets;
     });

     override readonly selectedCustomItem = computed(() => {
          const addr = this.walletsStoreService.selectedAddress();
          if (!addr) return null;

          const custom = this.transactionDropdownService.customDestinations().find(d => d.address === addr);

          const label = custom?.name || this.walletsUtilService.truncateAddress(addr);

          console.log('addr: ', addr);
          console.log('label: ', label);
          return {
               id: addr,
               name: label,
               display: label,
               address: addr,
          };
     });

     protected async onSelectedWalletIndexChange(): Promise<void> {
          return;
     }

     protected async refreshAccountObject(_env: any): Promise<void> {
          return;
     }

     protected clearInputFields(): void {
          this.walletsStoreService.setField('selectedAddress', '');
          return;
     }

     async confirmRemoveWallet(): Promise<void> {
          const confirmed = await this.dialogService.confirm('\n\nRemove this wallet? This cannot be undone and the wallet will need to be imported again.', 'Confirm Removal');

          if (!confirmed) {
               this.toastService.info('Wallet Removal cancelled', AppConstants.TOAST.INFO);
               return;
          }

          this.WalletConfiguratorComponent.removeCustomWallet();
     }
}
