import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { NgIcon } from '@ng-icons/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { LucideAngularModule } from 'lucide-angular';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { MptAuthorizeValidatorService } from '../../../../services/shared/validators/mpt-authorize-validator/mpt-authorize-validator.service';

@Component({
     selector: 'app-mpt-authorize-unauthorize',
     standalone: true,
     imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, SelectSearchDropdownComponent, FocusBorderDirective],
     templateUrl: './mpt-authorize-unauthorize.component.html',
     styleUrl: './mpt-authorize-unauthorize.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptAuthorizeUnauthorizeComponent {
     private readonly mptStoreService = inject(MptStoreService);
     public readonly mptUtilService = inject(MptUtilService);
     public readonly mptTransactionViewModelService = inject(MptTransactionViewModelService);
     public readonly mptAuthorizeValidator = inject(MptAuthorizeValidatorService);

     // Inputs from parent
     readonly destinationItems = input.required<SelectItem[]>();
     readonly selectedDestinationItem = input<SelectItem | null>(null);
     readonly availableMpts = input<any[]>([]);

     // Outputs to parent
     readonly selectedDestinationAddress = output<string>();
     readonly onMptSelected = output<SelectItem | null>();
     readonly canAuthorizeChange = output<boolean>();
     readonly validationErrorsChange = output<string[]>();

     // UI State
     showMptHelper = signal(false);
     showDestinationHelper = signal(false);
     isMptIssuanceIdFocused = signal(false);

     // Preset examples for MPT Issuance ID
     readonly mptIdExamples = ['0000000000000000000000000000000000000000000000000000000000000000', '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'];

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canAuthorizeChange.emit(this.mptAuthorizeValidator.canAuthorize());
               this.validationErrorsChange.emit(this.mptAuthorizeValidator.getAllValidationErrors());
          });
     }

     readonly selectedMpt = computed(() => {
          const issuanceId = this.mptStoreService.mptIssuanceId();
          if (!issuanceId) return null;

          // Get the full MPT object from the summary data
          const mpts = this.mptTransactionViewModelService?.infoData()?.mptsToShow || this.availableMpts();
          return mpts.find(m => m.mpt_issuance_id === issuanceId || m.id === issuanceId) || null;
     });

     readonly requiresIssuerAuth = computed(() => {
          const mpt = this.selectedMpt();
          if (!mpt) return false;

          // Check by flag name or numeric flags value
          const hasRequireAuth = mpt.flags?.includes?.('isRequireAuth') || mpt.flags?.includes?.('tfMPTRequireAuth') || !!(mpt.Flags & 0x00000004) || !!(mpt.flags & 0x00000004);

          return hasRequireAuth;
     });

     readonly isHolderAuthorized = computed(() => {
          const mpt = this.selectedMpt();
          if (!mpt) return false;

          // Check if the destination is already authorized
          const destination = this.mptStoreService.destination();
          if (!destination) return false;

          // This would come from your MPT data - check if the holder is authorized
          return mpt.isAuthorized === true || mpt.Authorized === true;
     });

     // Local getters for cleaner template
     get authAction() {
          return this.mptStoreService.authAction();
     }

     setAuthAction(action: 'authorize' | 'unauthorize') {
          this.mptStoreService.setField('authAction', action);
     }

     // Handle destination change
     onDestinationChange(item: SelectItem | null) {
          const address = item?.id || '';
          this.selectedDestinationAddress.emit(address);
          this.mptStoreService.setField('destination', address);
     }

     // MPT Issuance ID handlers
     get mptIssuanceId() {
          return this.mptStoreService.mptIssuanceId();
     }

     setMptIssuanceId(value: string) {
          this.mptStoreService.setField('mptIssuanceId', value);
     }

     onMptIssuanceIdBlur() {
          this.isMptIssuanceIdFocused.set(false);
          this.mptAuthorizeValidator.validateMptIssuanceId(this.mptIssuanceId);
     }

     onMptIssuanceIdFocus() {
          this.isMptIssuanceIdFocused.set(true);
     }

     clearMptIssuanceId() {
          this.setMptIssuanceId('');
     }

     setExampleMptId(example: string) {
          this.setMptIssuanceId(example);
     }

     toggleMptHelper() {
          this.showMptHelper.set(!this.showMptHelper());
     }

     toggleDestinationHelper() {
          this.showDestinationHelper.set(!this.showDestinationHelper());
     }

     // Get MPT display info for the info box
     getMptDisplayInfo() {
          const mpt = this.selectedMpt();
          if (!mpt) return null;

          return {
               id: mpt.mpt_issuance_id || mpt.id,
               assetScale: mpt.AssetScale || mpt.assetScale || 0,
               maxAmount: mpt.MaximumAmount || mpt.maximumAmount || 'Unlimited',
               outstanding: mpt.OutstandingAmount || mpt.outstandingAmount || '0',
          };
     }
}

// import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
// import { SelectItem, SelectSearchDropdownComponent } from '../../../shared/ui-components/select-search-dropdown/select-search-dropdown.component';
// import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
// import { NgIcon } from '@ng-icons/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
// import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
// import { LucideAngularModule } from 'lucide-angular';

// @Component({
//      selector: 'app-mpt-authorize-unauthorize',
//      standalone: true,
//      imports: [CommonModule, FormsModule, NgIcon, LucideAngularModule, SelectSearchDropdownComponent],
//      templateUrl: './mpt-authorize-unauthorize.component.html',
//      styleUrl: './mpt-authorize-unauthorize.component.css',
//      changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class MptAuthorizeUnauthorizeComponent {
//      private readonly mptStoreService = inject(MptStoreService);
//      public readonly mptUtilService = inject(MptUtilService);
//      public readonly mptTransactionViewModelService = inject(MptTransactionViewModelService);

//      // Inputs from parent
//      readonly destinationItems = input.required<SelectItem[]>();
//      readonly selectedDestinationItem = input<SelectItem | null>(null);

//      // Outputs to parent
//      readonly selectedDestinationAddress = output<string>();
//      readonly onMptSelected = output<SelectItem | null>(); // if needed

//      readonly selectedMpt = computed(() => {
//           const issuanceId = this.mptStoreService.mptIssuanceId();
//           if (!issuanceId) return null;

//           // Get the full MPT object from the summary data
//           const mpts = this.mptTransactionViewModelService?.infoData()?.mptsToShow || [];
//           return mpts.find(m => m.mpt_issuance_id === issuanceId) || null;
//      });

//      readonly requiresIssuerAuth = computed(() => {
//           const mpt = this.selectedMpt();
//           if (!mpt) return false;

//           // You can check by flag name or by numeric flags value
//           return !!mpt.flags?.includes('isRequireAuth') || !!(mpt.flags && (Number.parseInt(mpt.flags) & 0x00000004) !== 0); // tfMPTRequireAuth = 0x00000004
//      });

//      // Local getters for cleaner template
//      get authAction() {
//           return this.mptStoreService.authAction();
//      }

//      setAuthAction(action: 'authorize' | 'unauthorize') {
//           this.mptStoreService.setField('authAction', action);
//      }

//      // Handle destination change
//      onDestinationChange(item: SelectItem | null) {
//           const address = item?.id || '';
//           this.selectedDestinationAddress.emit(address);
//      }

//      // Optional: expose store directly if you prefer
//      get mptIssuanceId() {
//           return this.mptStoreService.mptIssuanceId();
//      }

//      setMptIssuanceId(value: string) {
//           this.mptStoreService.setField('mptIssuanceId', value);
//      }
// }
