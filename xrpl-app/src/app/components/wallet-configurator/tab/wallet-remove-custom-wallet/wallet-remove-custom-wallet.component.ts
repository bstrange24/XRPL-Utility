import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { SelectSearchDropdownComponent } from '../../../ui-dropdowns/select-search-dropdown/select-search-dropdown.component';
import { WalletDestinationBase } from '../../../../services/wallets/walletDestinationBase';
import { ActivatedRoute } from '@angular/router';
import { AcccountDataService } from '../../../../services/account-data/acccount-data.service';
import { CopyUtilService } from '../../../../services/copy-util/copy-util.service';
import { StorageService } from '../../../../services/local-storage/storage.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { TransactionDropdownService } from '../../../../services/transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../../../services/transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { WalletDataService } from '../../../../services/wallets/refresh-wallet/refresh-wallets.service';

@Component({
     selector: 'app-wallet-remove-custom-wallet',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, SelectSearchDropdownComponent],
     templateUrl: './wallet-remove-custom-wallet.component.html',
     styleUrl: './wallet-remove-custom-wallet.component.css',
})
export class WalletRemoveCustomWalletComponent extends WalletDestinationBase {
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);
     typedDestination = signal<string>('');

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     readonly customOnlyItems = computed(() => {
          const customItems = this.transactionDropdownService.customDestinations().map(dest => ({
               id: dest.address, // usually the value passed back on selection
               display: dest.name || this.utilsService.truncateAddress(dest.address), // ← this was missing!
               name: dest.name, // optional, if you need it elsewhere
               address: dest.address, // optional extra payload
          }));
          return customItems;
     });

     protected async onSelectedWalletIndexChange(): Promise<void> {}

     protected refreshAccountObject(_env: any): void {
          return;
     }

     protected clearInputFields(): void {
          return;
     }
}
