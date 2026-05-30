import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { XrplTxOptionsStore } from '../../../shared/stores/xrpl-tx-options.store';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { LucideAngularModule } from 'lucide-angular';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { AppConstants } from '../../../../core/app.constants';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';

@Component({
     selector: 'app-tickets-create',
     standalone: true,
     imports: [FormsModule, FieldHelperComponent, NgIcon, LucideAngularModule, FocusBorderDirective, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './tickets-create.component.html',
     styleUrl: './tickets-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsCreateComponent {
     public xrplTxOptionsStore = inject(XrplTxOptionsStore);
     public amountValidatorService = inject(AmountValidatorService);
     public utilsService = inject(UtilsService);

     private readonly optionsHasError = signal(false);
     private readonly optionsErrorMsg = signal('');
     private readonly optionsErrors = signal<string[]>([]);

     // Helper Item
     readonly ticketCountHelperItems = AppConstants.TICKET_COUNT_HELPER_ITEMS;

     // UI State
     canCreateTicketChange = output<boolean>();
     showTicketCountHelper = signal(false);

     constructor() {
          // Emit overall validation status whenever relevant signals change
          effect(() => {
               this.canCreateTicketChange.emit(this.canCreateTicket());
          });
     }

     onOptionsValidationChange(validation: { hasError: boolean; message: string; errors: string[] }) {
          this.optionsHasError.set(validation.hasError);
          this.optionsErrorMsg.set(validation.message || '');
          this.optionsErrors.set(validation.errors || []);
     }

     canCreateTicket = computed(() => {
          const countStr = this.xrplTxOptionsStore.ticketCountField()?.trim() ?? '';
          if (!countStr) return false;

          const count = Number(countStr);
          return count > 0 && count <= 250 && Number.isInteger(count);
     });

     validationErrorMessages = computed(() => {
          const errors: string[] = [];
          const countStr = this.xrplTxOptionsStore.ticketCountField()?.trim() ?? '';

          if (countStr) {
               const count = Number(countStr);
               if (Number.isNaN(count) || !Number.isInteger(count)) {
                    errors.push('Ticket count must be a valid whole number.');
               } else if (count <= 0) {
                    errors.push('Ticket count must be greater than 0.');
               } else if (count > 250) {
                    errors.push('Maximum 250 tickets can be created at once.');
               }
          }

          return errors;
     });

     // Check if there are any validation errors
     hasValidationErrors = computed(() => this.validationErrorMessages().length > 0);

     // Toggle Method
     toggleTicketCountHelper() {
          this.showTicketCountHelper.set(!this.showTicketCountHelper());
     }
}
