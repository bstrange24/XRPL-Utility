import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';
import { NgIcon } from '@ng-icons/core';

@Component({
     selector: 'app-wallet-derive-mnemonic',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NgIcon],
     templateUrl: './wallet-derive-mnemonic.component.html',
     styleUrl: './wallet-derive-mnemonic.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletDeriveMnemonicComponent {
     public readonly walletConfiguratorComponent = inject(WalletConfiguratorComponent);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);

     onMnemonicInput(event: Event): void {
          const target = event.target as HTMLTextAreaElement;
          this.walletsStoreService.setField('mnemonic', target.value);
          this.walletsUtilService.onMnemonicInput();
     }

     wordCount(): number {
          const mnemonic = this.walletsStoreService.mnemonicInput().trim();
          return mnemonic ? mnemonic.split(/\s+/).length : 0;
     }
}
