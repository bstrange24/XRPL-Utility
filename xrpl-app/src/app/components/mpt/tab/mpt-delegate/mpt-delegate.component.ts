import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';

@Component({
     selector: 'app-mpt-delegate',
     standalone: true,
     imports: [FormsModule, LucideAngularModule, FocusBorderDirective, InputIconsComponent],
     template: `
          <div class="card-base" style="margin-bottom: 1.5rem;">
               <h4 class="section-heading">
                    <lucide-icon name="wand" class="section-heading-icon-green"></lucide-icon>
                    Act as Delegate (optional)
               </h4>

               <p class="text-secondary">Submit this MPT Payment (mint/burn) or Lock/Unlock for another account that delegated these permissions to the selected wallet. Leave empty to act as the selected wallet itself.</p>

               <div class="relative">
                    <input type="text" class="input-base-with-validation" app-focus-border [isValid]="isDelegating() && !isInvalid()" [isInvalid]="isInvalid()" [ngModel]="store.delegatorAddress()" (ngModelChange)="store.setField('delegatorAddress', $event)" placeholder="Delegator account r..." />
                    <app-input-icons [isValid]="isDelegating() && !isInvalid()" [isInvalid]="isInvalid()" [showClear]="isDelegating()" (clear)="clear()" />
               </div>

               @if (isInvalid()) {
                    <p class="form-error">Enter a valid XRP address different from the selected wallet.</p>
               }
               @if (isDelegating()) {
                    <p class="text-secondary">Requires the delegator's PaymentMint / PaymentBurn (send) or MPTokenIssuanceLock / MPTokenIssuanceUnlock permission. The MPT issuer must be the delegator (or the destination, for burns).</p>
               }
          </div>
     `,
})
export class MptDelegateComponent {
     readonly store = inject(MptStoreService);
     private readonly walletManagerService = inject(WalletManagerService);

     readonly isDelegating = computed(() => !!this.store.delegatorAddress()?.trim());

     readonly isInvalid = computed(() => {
          const value = this.store.delegatorAddress()?.trim();
          if (!value) return false;
          return !xrpl.isValidAddress(value) || value === this.walletManagerService.getSelectedWallet()?.address;
     });

     clear(): void {
          this.store.setField('delegatorAddress', '');
     }
}
