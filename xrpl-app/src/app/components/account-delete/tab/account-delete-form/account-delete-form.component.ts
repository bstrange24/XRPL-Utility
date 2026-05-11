import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, input, Output, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransactionOptionsSectionComponent } from '../../../shared/transaction-options-section/transaction-options-section.component';
import { SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { TransactionOptionsComponent } from '../../../shared/transaction-options/transaction-options.component';
import { AccountConfiguratorStoreService } from '../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { NgIcon } from '@ng-icons/core';
import { ToggleSliderComponent } from '../../../shared/toggle-slider/toggle-slider.component';
import * as xrpl from 'xrpl';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';

@Component({
     selector: 'app-account-delete-form',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, SelectSearchDropdownComponent, TransactionOptionsSectionComponent, MatSlideToggleModule, TransactionOptionsComponent, NgIcon, ToggleSliderComponent],
     templateUrl: './account-delete-form.component.html',
     styleUrl: './account-delete-form.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDeleteFormComponent {
     public readonly connectionGuard = inject(ConnectionGuardService);
     public readonly txUiService = inject(TransactionUiService);
     public readonly accountConfiguratorStoreService = inject(AccountConfiguratorStoreService);

     view = input.required<any>(); // for deleteBlockers(), deleteWalletButtonLabel()
     info = input.required<any>(); // for canDelete
     destinationItems = input.required<any[]>();
     selectedDestinationItem = input.required<any>();
     destinationSearchQuery = input.required<string>();
     wantsOptions = input.required<boolean>(); // txUiService.wantsOptions()
     canSubmit = input<boolean>(false);
     tab = input.required<string>(); // 'deleteAccount'
     @Output() optionsToggled = new EventEmitter<boolean>();

     performAction = output<void>();
     clearFields = output<void>();
     searchQueryChange = output<string>();
     destinationChange = output<any>();
     toggleOptions = output<boolean>();

     getFinalDestination = computed(() => {
          const searchQuery = this.destinationSearchQuery()?.trim() || '';

          // 1. If user is typing something, prioritize the search query (manual entry)
          if (searchQuery) {
               if (xrpl.isValidAddress(searchQuery)) {
                    return searchQuery;
               } else {
                    return null; // invalid typed value
               }
          }

          // 2. Otherwise fall back to selected dropdown item
          const selectedItem = this.selectedDestinationItem();
          if (selectedItem?.id && xrpl.isValidAddress(selectedItem.id)) {
               return selectedItem.id;
          }

          return null;
     });

     isDestinationValid = computed(() => {
          const destination = this.getFinalDestination();
          return !!destination && xrpl.isValidAddress(destination);
     });

     isDestinationInvalid = computed(() => {
          const destination = this.getFinalDestination();
          // Only show error if user has entered something (either selected or typed)
          const hasInput = this.selectedDestinationItem() || this.destinationSearchQuery();
          return hasInput && !this.isDestinationValid();
     });

     // Check if there are any validation errors
     hasValidationErrors = computed(() => {
          if (this.isDestinationInvalid()) return true;
          if (this.txUiService.wantsOptions()) return true;
          return false;
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];

          // Destination error
          if (this.isDestinationInvalid()) {
               errors.push('Destination address is invalid. Please enter a valid XRP address.');
          }

          return errors;
     });

     // Get validation error message
     validationErrorMessage = computed(() => {
          if (this.isDestinationInvalid()) {
               return 'Destination address is invalid. Please enter a valid XRP address.';
          }
          return '';
     });
}
