import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import * as xrpl from 'xrpl';
import { TrustlineStoreService } from '../../../../services/trustlines/trustline-store/trustline-store.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { TrustlineDelegateAction } from '../../constants/trustline.types';

@Component({
     selector: 'app-trustline-delegate',
     standalone: true,
     imports: [FormsModule, LucideAngularModule, FocusBorderDirective, InputIconsComponent],
     template: `
          <div class="card-base" style="margin-bottom: 1.5rem;">
               <h4 class="section-heading">
                    <lucide-icon name="wand" class="section-heading-icon-green"></lucide-icon>
                    Act as Delegate (optional)
               </h4>

               <p class="text-secondary">Authorize, freeze or unfreeze a trust line for another account that delegated these permissions to the selected wallet. Leave empty to set a trust line for the selected wallet itself.</p>

               <div class="relative">
                    <input type="text" class="input-base-with-validation" app-focus-border [isValid]="isDelegating() && !isDelegatorInvalid()" [isInvalid]="isDelegatorInvalid()" [ngModel]="store.delegatorAddress()" (ngModelChange)="store.setField('delegatorAddress', $event)" placeholder="Delegator (issuer) account r..." />
                    <app-input-icons [isValid]="isDelegating() && !isDelegatorInvalid()" [isInvalid]="isDelegatorInvalid()" [showClear]="isDelegating()" (clear)="clear()" />
               </div>

               @if (isDelegatorInvalid()) {
                    <p class="form-error">Enter a valid XRP address different from the selected wallet.</p>
               }
               @if (isDelegating()) {
                    <label class="label-primary mt-4">Action</label>
                    <select class="input-base" [ngModel]="store.delegateAction()" (ngModelChange)="setAction($event)">
                         <option value="authorize">Authorize trust line (TrustlineAuthorize)</option>
                         <option value="freeze">Freeze trust line (TrustlineFreeze)</option>
                         <option value="unfreeze">Unfreeze trust line (TrustlineUnfreeze)</option>
                    </select>

                    <label class="label-primary mt-4">Holder (counterparty) address</label>
                    <div class="relative">
                         <input type="text" class="input-base-with-validation" app-focus-border [isValid]="!!store.delegateHolder() && !isHolderInvalid()" [isInvalid]="isHolderInvalid()" [ngModel]="store.delegateHolder()" (ngModelChange)="store.setField('delegateHolder', $event)" placeholder="Holder account r..." />
                    </div>
                    @if (isHolderInvalid()) {
                         <p class="form-error">Enter a valid XRP address different from the delegator.</p>
                    }

                    <label class="label-primary mt-4">Currency code</label>
                    <input type="text" class="input-base" app-focus-border [ngModel]="store.delegateCurrency()" (ngModelChange)="store.setField('delegateCurrency', $event)" placeholder="USD" />

                    <p class="text-secondary mt-4">The delegator's existing limit on this trust line is kept; only the selected flag is changed.</p>
               }
          </div>
     `,
})
export class TrustlineDelegateComponent {
     readonly store = inject(TrustlineStoreService);
     private readonly walletManagerService = inject(WalletManagerService);

     readonly isDelegating = computed(() => !!this.store.delegatorAddress()?.trim());

     readonly isDelegatorInvalid = computed(() => {
          const value = this.store.delegatorAddress()?.trim();
          if (!value) return false;
          return !xrpl.isValidAddress(value) || value === this.walletManagerService.getSelectedWallet()?.address;
     });

     readonly isHolderInvalid = computed(() => {
          const value = this.store.delegateHolder()?.trim();
          if (!value) return false;
          return !xrpl.isValidAddress(value) || value === this.store.delegatorAddress()?.trim();
     });

     setAction(action: TrustlineDelegateAction): void {
          this.store.setField('delegateAction', action);
     }

     clear(): void {
          this.store.setField('delegatorAddress', '');
          this.store.setField('delegateHolder', '');
          this.store.setField('delegateCurrency', '');
     }
}
