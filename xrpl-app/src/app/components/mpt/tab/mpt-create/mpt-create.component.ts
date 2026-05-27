import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { JsonEditorComponent } from '../../../shared/json-editor/json-editor.component';
import { MptStoreService } from '../../../../services/mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../../services/mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { LucideAngularModule } from 'lucide-angular';
import { MptValidatorService } from '../../../../services/shared/validators/mpt/mpt-validator/mpt-validator.service';
import { FocusBorderDirective } from '../../../../services/shared/focus-border/focus-border.directive';
import { AmountValidatorService } from '../../../../services/shared/validators/amount-validator/amount-validator.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { AppConstants } from '../../../../core/app.constants';
import { FieldHelperComponent } from '../../../shared/field-helper/field-helper.component';
import { ValidationErrorsComponent } from '../../../shared/validation-errors/validation-errors.component';
import { InputIconsComponent } from '../../../shared/input-icons/input-icons.component';

@Component({
     selector: 'app-mpt-create',
     standalone: true,
     imports: [CommonModule, FormsModule, FocusBorderDirective, FieldHelperComponent, LucideAngularModule, JsonEditorComponent, NgIcon, ValidationErrorsComponent, InputIconsComponent],
     templateUrl: './mpt-create.component.html',
     styleUrl: './mpt-create.component.css',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MptCreateComponent {
     @ViewChild('jsonEditor') jsonEditor!: JsonEditorComponent;

     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtil = inject(MptUtilService);
     public readonly mptValidator = inject(MptValidatorService);
     public readonly amountValidatorService = inject(AmountValidatorService);
     public readonly utilsService = inject(UtilsService);

     // Pass these from parent if needed
     readonly metadataByteLength = input.required<number>();
     readonly metadataIsValid = input.required<boolean>();

     // Outputs
     canCreateMptChange = output<boolean>();
     validationErrorsChange = output<string[]>();

     // Preset values for quick selection
     readonly assetScalePresets = AppConstants.ASSET_SCALE_PRESETS;
     readonly tokenCountPresets = AppConstants.MPT_TOKEN_COUNT_PRESETS;
     readonly transferFeePresets = AppConstants.TRANSFER_RATE_PRESETS;
     readonly transferFeeHelperItems = AppConstants.TRANSFER_FEE_HELPER_ITEMS;
     readonly assetScaleHelperItems = AppConstants.ASSET_SCALE_HELPER_ITEMS;
     readonly mptMetadataHelperItems = AppConstants.MPT_META_DATA_HELPER;
     readonly mptMaxTokenHelperItems = AppConstants.MPT_MAX_TOKEN_HELPER;

     showAssetScaleHelper = signal(false);
     showTransferFeeHelper = signal(false);
     showMptMetadataHelper = signal(false);
     showMaxTokensHelper = signal(false);
     isFocused = signal(false);
     isFocusedTokenCount = signal(false);
     isFocusedAssetScale = signal(false);
     isFocusedTransferFee = signal(false);

     constructor() {
          // Emit validation status changes
          effect(() => {
               this.canCreateMptChange.emit(this.mptValidator.canCreateMpt());
               this.validationErrorsChange.emit(this.mptValidator.getAllValidationErrors());
          });
     }

     // Getters / Setters for cleaner template
     get assetScale() {
          return this.mptStoreService.assetScale();
     }

     set assetScale(value: number) {
          this.mptStoreService.setField('assetScale', value);
     }

     get tokenCount() {
          return this.mptStoreService.tokenCount();
     }

     set tokenCount(value: number) {
          this.mptStoreService.setField('tokenCount', value);
     }

     get transferFee() {
          return this.mptStoreService.transferFee();
     }

     set transferFee(value: number) {
          this.mptStoreService.setField('transferFee', value);
     }

     get metaData() {
          return this.mptStoreService.metaData();
     }

     set metaData(value: string) {
          this.mptStoreService.setField('metaData', value);
     }

     formatJson() {
          if (this.jsonEditor) {
               this.jsonEditor.format();
          }
     }

     onMetadataChanged(newMetadata: string) {
          this.mptStoreService.setField('metaData', newMetadata.trim());
     }

     setPresetTokenCount(count: number) {
          this.mptStoreService.setField('tokenCount', count);
     }

     setPresetAssetScale(scale: number) {
          this.mptStoreService.setField('assetScale', scale);
     }

     setPresetTransferFee(fee: number) {
          this.mptStoreService.setField('transferFee', fee);
     }

     clearField(field: 'tokenCount' | 'assetScale' | 'transferFee') {
          this.mptStoreService.setField(field, null as any);
     }

     toggleAssetScaleHelper() {
          this.showAssetScaleHelper.set(!this.showAssetScaleHelper());
     }

     toggleTransferFeeHelper() {
          this.showTransferFeeHelper.set(!this.showTransferFeeHelper());
     }

     toggleMptMetadataHelper() {
          this.showMptMetadataHelper.update(v => !v);
     }

     toggleMaxTokensHelper() {
          this.showMaxTokensHelper.update(v => !v);
     }

     formatSecondsToHuman(seconds: string): string {
          // Not needed for MPT, but kept for consistency
          return '';
     }
}
