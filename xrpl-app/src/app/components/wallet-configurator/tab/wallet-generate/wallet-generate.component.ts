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
     selector: 'app-wallet-generate',
     standalone: true,
     imports: [CommonModule, FormsModule, LucideAngularModule, OverlayModule, NgIcon],
     templateUrl: './wallet-generate.component.html',
     styleUrl: './wallet-generate.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletGenerateComponent {
     public readonly walletConfiguratorComponent = inject(WalletConfiguratorComponent);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);
}
