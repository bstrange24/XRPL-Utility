import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as xrpl from 'xrpl';

import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { TrustlineStoreService } from '../../../../services/trustlines/trustline-store/trustline-store.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { TrustlineDelegateAction } from '../../constants/trustline.types';

@Component({
     selector: 'app-trustline-delegate',
     standalone: true,
     imports: [FormsModule, FocusBorderDirective, InputIconsComponent, SelectSearchDropdownComponent],
     template: `
          @if (enabled()) {
               <div class="mt-4 w-full space-y-3">
                    <div class="space-y-3">
                         <p class="text-secondary">Authorize, freeze or unfreeze a trust line for another account that delegated these permissions to the selected wallet.</p>

                         <div class="relative">
                              <input type="text" class="input-base-with-validation" app-focus-border [isValid]="isDelegating() && !isDelegatorInvalid()" [isInvalid]="isDelegatorInvalid()" [ngModel]="store.delegatorAddress()" (ngModelChange)="store.setField('delegatorAddress', $event)" placeholder="Delegator (issuer) account r..." />
                              <app-input-icons [isValid]="isDelegating() && !isDelegatorInvalid()" [isInvalid]="isDelegatorInvalid()" [showClear]="isDelegating()" (clear)="clear()" />
                         </div>

                         @if (isDelegatorInvalid()) {
                              <p class="form-error">Enter a valid XRP address different from the selected wallet.</p>
                         }

                    <div class="space-y-1.5">
                         <span class="label-primary">Action</span>
                         <app-select-search-dropdown app-focus-border [items]="actionItems" [value]="selectedAction()" [showClearButton]="false" [showInlineErrorMessage]="false" (valueChange)="onActionSelected($event)" placeholder="Select action"> </app-select-search-dropdown>
                    </div>

                    <label for="trustlineDelegateHolder" class="label-primary mt-4">Holder (counterparty) address</label>
                    <div class="relative">
                         <input id="trustlineDelegateHolder" type="text" class="input-base-with-validation" app-focus-border [isValid]="!!store.delegateHolder() && !isHolderInvalid()" [isInvalid]="isHolderInvalid()" [ngModel]="store.delegateHolder()" (ngModelChange)="store.setField('delegateHolder', $event)" placeholder="Holder account r..." />
                    </div>
                    @if (isHolderInvalid()) {
                         <p class="form-error">Enter a valid XRP address different from the delegator.</p>
                    }

                    <label for="trustlineDelegateCurrency" class="label-primary mt-4">Currency code</label>
                    <input id="trustlineDelegateCurrency" type="text" class="input-base" app-focus-border [ngModel]="store.delegateCurrency()" (ngModelChange)="store.setField('delegateCurrency', $event)" placeholder="USD" />

                         <p class="text-secondary mt-4">The delegator's existing limit on this trust line is kept; only the selected flag is changed.</p>
                    </div>
               </div>
          }
     `,
})
export class TrustlineDelegateComponent {
     readonly enabled = input(false);
     readonly store = inject(TrustlineStoreService);
     private readonly walletManagerService = inject(WalletManagerService);

     readonly isDelegating = computed(() => this.enabled() && !!this.store.delegatorAddress()?.trim());

     readonly isDelegatorInvalid = computed(() => {
          const value = this.store.delegatorAddress()?.trim();
          if (!this.enabled()) return false;
          if (!value) return true;
          return !xrpl.isValidAddress(value) || value === this.walletManagerService.getSelectedWallet()?.address;
     });

     readonly isHolderInvalid = computed(() => {
          const value = this.store.delegateHolder()?.trim();
          if (!value) return false;
          return !xrpl.isValidAddress(value) || value === this.store.delegatorAddress()?.trim();
     });

     readonly actionItems: SelectItem[] = [
          { id: 'authorize', display: 'Authorize trust line (TrustlineAuthorize)' },
          { id: 'freeze', display: 'Freeze trust line (TrustlineFreeze)' },
          { id: 'unfreeze', display: 'Unfreeze trust line (TrustlineUnfreeze)' },
     ];

     readonly selectedAction = computed(() => this.actionItems.find(i => i.id === this.store.delegateAction()) ?? null);

     onActionSelected(item: SelectItem | null): void {
          if (item) this.setAction(item.id as TrustlineDelegateAction);
     }

     setAction(action: TrustlineDelegateAction): void {
          this.store.setField('delegateAction', action);
     }

     clear(): void {
          this.store.setField('delegatorAddress', '');
          this.store.setField('delegateHolder', '');
          this.store.setField('delegateCurrency', '');
     }
}
