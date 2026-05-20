// mpt-validator.service.ts
import { computed, inject, Injectable } from '@angular/core';
import { MptStoreService } from '../../../mpt/mpt-store/mpt-store.service';
import { MptTransactionViewModelService } from '../../../mpt/mpt-transaction-view-model/mpt-transaction-view-model.service';
import { MptUtilService } from '../../../mpt/mpt-util/mpt-util.service';

@Injectable({
     providedIn: 'root',
})
export class MptValidatorService {
     public readonly mptStoreService = inject(MptStoreService);
     public readonly viewModel = inject(MptTransactionViewModelService);
     public readonly mptUtil = inject(MptUtilService);

     // Maximum Tokens Validation
     isTokenCountValid = computed(() => {
          const count = this.mptStoreService.tokenCount();

          if (count === null || count === undefined) {
               return false;
          }

          const num = Number(count);
          return Number.isInteger(num) && num >= 1 && num <= 10_000_000_000_000_000; // 10 quadrillion
     });

     isTokenCountInvalid = computed(() => {
          const count = this.mptStoreService.tokenCount();

          if (count === null || count === undefined) {
               return false;
          }

          const num = Number(count);
          return !Number.isInteger(num) || num < 1 || num > 10_000_000_000_000_000;
     });

     getTokenCountErrorMessage = computed(() => {
          const count = this.mptStoreService.tokenCount();
          // if (count === null || count === undefined) return 'Maximum Tokens is required.';
          if (count === null || count === undefined) return '';

          const num = Number(count);
          if (!Number.isInteger(num)) return 'Maximum Tokens must be a whole number.';
          if (num < 1) return 'Maximum Tokens must be at least 1.';
          if (num > 10_000_000_000_000_000) return 'Maximum Tokens cannot exceed 10,000,000,000,000,000.';
          return '';
     });

     // Asset Scale Validation
     isAssetScaleValid = computed(() => {
          const scale = this.mptStoreService.assetScale();

          // Asset scale is optional - null/undefined is valid (will use default 0)
          if (scale === null || scale === undefined) {
               return true;
          }

          const num = Number(scale);
          return Number.isInteger(num) && num >= 0 && num <= 15;
     });

     isAssetScaleInvalid = computed(() => {
          const scale = this.mptStoreService.assetScale();

          // Empty is valid
          if (scale === null || scale === undefined) {
               return false;
          }

          const num = Number(scale);
          return !Number.isInteger(num) || num < 0 || num > 15;
     });

     getAssetScaleErrorMessage = computed(() => {
          const scale = this.mptStoreService.assetScale();
          if (scale === null || scale === undefined) return '';

          const num = Number(scale);
          if (!Number.isInteger(num)) return 'Asset Scale must be a whole number.';
          if (num < 0) return 'Asset Scale cannot be negative.';
          if (num > 15) return 'Asset Scale cannot exceed 15.';
          return '';
     });

     // Transfer Fee Validation
     isTransferFeeValid = computed(() => {
          const fee = this.mptStoreService.transferFee();

          // Transfer fee is optional
          if (fee === null || fee === undefined) {
               return true;
          }

          const num = Number(fee);
          return Number.isInteger(num) && num >= 0 && num <= 50000;
     });

     isTransferFeeInvalid = computed(() => {
          const fee = this.mptStoreService.transferFee();

          if (fee === null || fee === undefined) {
               return false;
          }

          const num = Number(fee);
          return !Number.isInteger(num) || num < 0 || num > 50000;
     });

     getTransferFeeErrorMessage = computed(() => {
          const fee = this.mptStoreService.transferFee();
          if (fee === null || fee === undefined) return '';

          const num = Number(fee);
          if (!Number.isInteger(num)) return 'Transfer Fee must be a whole number.';
          if (num < 0) return 'Transfer Fee cannot be negative.';
          if (num > 50000) return 'Transfer Fee cannot exceed 50,000 (50%).';
          return '';
     });

     // Transfer Fee Dependency Validation (only valid if Can Transfer is enabled)
     isTransferFeeApplicable = computed(() => {
          // Access canTransfer from mptUtil.flags
          return this.mptUtil.flags().canTransfer;
     });

     // Metadata Validation
     isMetadataValid = computed(() => {
          const metadata = this.mptStoreService.metaData();

          // Metadata is optional
          if (!metadata || metadata.trim() === '') {
               return true;
          }

          try {
               const parsed = JSON.parse(metadata);

               // Check if it's a valid JSON object (not array or primitive)
               if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                    return false;
               }

               return true;
          } catch (e) {
               return false;
          }
     });

     isMetadataInvalid = computed(() => {
          const metadata = this.mptStoreService.metaData();

          if (!metadata || metadata.trim() === '') {
               return false;
          }

          return !this.isMetadataValid();
     });

     getMetadataErrorMessage = computed(() => {
          const metadata = this.mptStoreService.metaData();
          if (!metadata || metadata.trim() === '') return '';

          try {
               JSON.parse(metadata);

               // Check if it's an object
               const parsed = JSON.parse(metadata);
               if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                    return 'Metadata must be a valid JSON object (not an array or primitive value).';
               }

               return '';
          } catch (e) {
               return 'Invalid JSON format. Please check your syntax.';
          }
     });

     // Metadata Size Validation
     isMetadataSizeValid = computed(() => {
          return this.viewModel.metadataByteLength() <= 1024;
     });

     isMetadataSizeInvalid = computed(() => {
          return this.viewModel.metadataByteLength() > 1024;
     });

     // Overall Form Validation
     canCreateMpt = computed(() => {
          if (!this.isTokenCountValid()) return false;
          if (this.isAssetScaleInvalid()) return false;
          if (this.isTransferFeeInvalid()) return false;
          // if (this.isMetadataInvalid()) return false;
          if (this.isMetadataSizeInvalid()) return false;

          // Additional check: Transfer fee requires Can Transfer flag
          const transferFee = this.mptStoreService.transferFee();
          if (transferFee && transferFee > 0 && !this.mptUtil.flags().canTransfer) {
               return false;
          }

          return true;
     });

     // Get all validation error messages
     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const tokenCountError = this.getTokenCountErrorMessage();
          if (tokenCountError) errors.push(`Maximum Tokens: ${tokenCountError}`);

          const assetScaleError = this.getAssetScaleErrorMessage();
          if (assetScaleError) errors.push(`Asset Scale: ${assetScaleError}`);

          const transferFeeError = this.getTransferFeeErrorMessage();
          if (transferFeeError) errors.push(`Transfer Fee: ${transferFeeError}`);

          // const metadataError = this.getMetadataErrorMessage();
          // if (metadataError) errors.push(`Metadata: ${metadataError}`);

          // if (this.isMetadataSizeInvalid()) {
          //      errors.push(`Metadata exceeds 1024 byte limit (current: ${this.viewModel.metadataByteLength()} bytes)`);
          // }

          // Check transfer fee dependency
          const transferFee = this.mptStoreService.transferFee();
          if (transferFee && transferFee > 0 && !this.mptUtil.flags().canTransfer) {
               errors.push('Transfer Fee requires "Can Transfer" to be enabled in the flags section.');
          }

          return errors;
     });
}
