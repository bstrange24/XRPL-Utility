import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WalletsStoreService } from '../../../../services/wallets/wallets-store/wallets-store.service';
import { WalletsUtilService } from '../../../../services/wallets/wallets-util/wallets-util.service';
import { WalletsViewModelService } from '../../../../services/wallets/wallets-view-model/wallets-view-model.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletConfiguratorComponent } from '../../wallet-configurator.component';
import * as xrpl from 'xrpl';
import { NgIcon } from '@ng-icons/core';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { ButtonTooltipComponent } from '../../../shared/button-tooltip/button-tooltip.component';

@Component({
     selector: 'app-wallet-derive-seed',
     standalone: true,
     imports: [CommonModule, NgIcon, FormsModule, FocusBorderDirective, LucideAngularModule, OverlayModule, ButtonTooltipComponent],
     templateUrl: './wallet-derive-seed.component.html',
     styleUrl: './wallet-derive-seed.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletDeriveSeedComponent {
     public readonly walletConfiguratorComponent = inject(WalletConfiguratorComponent);
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly walletsUtilService = inject(WalletsUtilService);
     public readonly walletsViewModelService = inject(WalletsViewModelService);

     onSeedChange(value: string): void {
          const trimmed = value.trim();

          this.walletsStoreService.setField('seed', trimmed);

          const isValid = this.validateSeed(trimmed);

          this.walletsStoreService.setField('seedValid', isValid);
     }

     clearSeed(): void {
          this.walletsStoreService.setField('seed', '');
          this.walletsStoreService.setField('seedValid', false);
     }

     private validateSeed(seed: string): boolean {
          if (!seed) return false;

          try {
               xrpl.Wallet.fromSeed(seed);
               return true;
          } catch {
               return false;
          }
     }

     isSeedValid = computed(() => {
          const seed = this.walletsStoreService.seed()?.trim();

          if (!seed) return false;

          return this.walletsStoreService.seedValid();
     });

     isSeedInvalid = computed(() => {
          const seed = this.walletsStoreService.seed()?.trim();

          if (!seed) return false;

          return !this.walletsStoreService.seedValid();
     });

     hasValidationErrors = computed(() => {
          return this.isSeedInvalid();
     });

     validationErrorMessage = computed(() => {
          const errors: string[] = [];

          if (this.isSeedInvalid()) {
               errors.push('Invalid XRPL family seed. Seed must start with "s" and be properly encoded.');
          }

          return errors.join(', ');
     });
}
