import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';

@Component({
     selector: 'app-wallet-derive-seed',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule],
     templateUrl: './wallet-derive-seed.component.html',
     styleUrl: './wallet-derive-seed.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletDeriveSeedComponent {
     public readonly walletConfiguratorComponent = inject(WalletConfiguratorComponent);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);
}
