import { computed, inject, Injectable, signal } from '@angular/core';
import { CreateNftStoreService } from '../../../../nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../nft/nft-util/nft-util.service';
import { UriValidatorService } from '../../uri-validator/uri-validator.service';
import * as xrpl from 'xrpl';
import { RealTimeExpirationService } from '../../../real-time-date-expiration-check/real-time-expiration.service';
import { ExpirationValidatorService } from '../../expiration-validator/expiration-validator.service';

@Injectable({
     providedIn: 'root',
})
export class NftValidatorService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly uriValidatorService = inject(UriValidatorService);
     public readonly nftUtilService = inject(NftUtilService);
     private readonly realTimeService = inject(RealTimeExpirationService);
     private readonly expirationValidator = inject(ExpirationValidatorService);

     private readonly dropdownDestinationIsValid = signal<boolean>(true);

     isTaxonValid = computed(() => {
          const count = this.nftCreateStoreService.taxon();

          if (count === null || count === undefined || count === '') {
               return false;
          }

          const num = Number(count);
          return Number.isInteger(num) && num >= 0 && num <= 4_294_967_295n;
     });

     isTaxonInvalid = computed(() => {
          const count = this.nftCreateStoreService.taxon();

          if (count === null || count === undefined) {
               return false;
          }

          const num = Number(count);
          return !Number.isInteger(num) || num < 0 || num > 4_294_967_295n;
     });

     getTaxonErrorMessage = computed(() => {
          const count = this.nftCreateStoreService.taxon();
          // if (count === null || count === undefined) return 'Maximum Tokens is required.';
          if (count === null || count === undefined) return '';

          const num = Number(count);
          if (!Number.isInteger(num)) return 'Taxon must be a whole number.';
          if (num < 0) return 'Taxon must be at least 0.';
          if (num > 4_294_967_295n) return 'Taxon cannot exceed 4,294,967,295.';
          return '';
     });

     // Transfer Fee Validation
     isTransferFeeValid = computed(() => {
          const fee = this.nftCreateStoreService.transferFee();

          // Transfer fee is optional
          if (fee === null || fee === undefined) {
               return true;
          }

          const num = Number(fee);
          return Number.isInteger(num) && num >= 0 && num <= 50000;
     });

     isTransferFeeInvalid = computed(() => {
          const fee = this.nftCreateStoreService.transferFee();

          if (fee === null || fee === undefined) {
               return false;
          }

          const num = Number(fee);
          return !Number.isInteger(num) || num < 0 || num > 50000;
     });

     getTransferFeeErrorMessage = computed(() => {
          const fee = this.nftCreateStoreService.transferFee();
          if (fee === null || fee === undefined) return '';

          const num = Number(fee);
          if (!Number.isInteger(num)) return 'Transfer Fee must be a whole number.';
          if (num < 0) return 'Transfer Fee cannot be negative.';
          if (num > 50000) return 'Transfer Fee cannot exceed 50,000 (50%).';
          return '';
     });

     isNftMinterInvalid = computed(() => {
          const address = this.nftCreateStoreService.nfTokenMinterAddress();
          return !!address && !xrpl.isValidAddress(address);
     });

     isNftMinterValid = computed(() => {
          const address = this.nftCreateStoreService.nfTokenMinterAddress();
          if (!address) return true; // Empty is valid (means no minter)
          return xrpl.isValidAddress(address);
     });

     getNftMinterErrorMessage = computed(() => {
          const address = this.nftCreateStoreService.nfTokenMinterAddress();
          if (address === null || address === undefined) return '';

          if (this.isNftMinterInvalid()) return 'Please enter a valid XRP address.';
          return '';
     });

     isNftOwnerInvalid = computed(() => {
          const address = this.nftCreateStoreService.nftOwnerAddress();
          return !!address && !xrpl.isValidAddress(address);
     });

     isNftOwnerValid = computed(() => {
          const address = this.nftCreateStoreService.nftOwnerAddress();
          if (!address) return true; // Empty is valid (means no minter)
          return xrpl.isValidAddress(address);
     });

     getNftOwnerErrorMessage = computed(() => {
          const address = this.nftCreateStoreService.nftOwnerAddress();
          if (address === null || address === undefined) return '';

          if (this.isNftOwnerInvalid()) return 'Please enter a valid XRP address.';
          return '';
     });

     getUriErrorMessage = computed(() => {
          const fee = this.nftCreateStoreService.nfTokenMinterAddress();
          if (fee === null || fee === undefined) return '';

          if (this.uriValidatorService.hasNftCreateInvalidUri()) return 'Please enter a valid URI.';
          return '';
     });

     isNftTokenIdValid = computed(() => {
          const nftId = this.nftCreateStoreService.nftId();

          if (!nftId || nftId.trim().length === 0) {
               return false;
          }

          const hexRegex = /^[0-9A-Fa-f]{64}$/;
          return hexRegex.test(nftId.trim());
     });

     isNftTokenIdInvalid = computed(() => {
          const nftId = this.nftCreateStoreService.nftId();

          if (!nftId || nftId.trim().length === 0) {
               return false;
          }

          return !this.isNftTokenIdValid();
     });

     getNftTokenIdErrorMessage = computed(() => {
          const nftId = this.nftCreateStoreService.nftId();

          if (!nftId || nftId.trim().length === 0) {
               return '';
          }

          if (nftId.trim().length !== 64) {
               return `NFT Token ID must be exactly 64 characters (current: ${nftId.trim().length} characters).`;
          }

          if (!this.isNftTokenIdValid()) {
               return 'NFT Token ID must be a valid 64-character hexadecimal string (0-9, A-F).';
          }

          return '';
     });

     isDestinationValid = computed(() => {
          const destination = this.nftCreateStoreService.destination()?.trim() || '';

          if (!destination) return false;

          const dropdownValid = this.dropdownDestinationIsValid();
          const xrplValid = xrpl.isValidAddress(destination);
          const notSelf = destination !== this.getCurrentAddress();

          return dropdownValid && xrplValid && notSelf;
     });

     isDestinationInvalid = computed(() => {
          const destination = this.nftCreateStoreService.destination();

          if (!destination || destination.trim().length === 0) {
               return false;
          }

          return !this.isDestinationValid();
     });

     getDestinationErrorMessage = computed(() => {
          const destination = this.nftCreateStoreService.nftIdSearchQuery()?.trim() || '';
          const sellOfferEnabled = this.nftCreateStoreService.enableSellOnNftCreation();

          if (!sellOfferEnabled) return '';

          // Only show error if user entered something invalid
          if (destination && !this.dropdownDestinationIsValid()) {
               return 'Please enter a valid XRP address.';
          }

          if (destination && !xrpl.isValidAddress(destination)) {
               return 'Please enter a valid XRP address.';
          }

          const currentAddress = this.getCurrentAddress();
          if (destination && currentAddress && destination === currentAddress) {
               return 'You cannot send to your own address.';
          }

          return ''; // Empty = valid (since it's optional)
     });

     private getCurrentAddress(): string {
          // This should be injected or passed from parent
          return '';
     }

     setDestinationValidation(isValid: boolean) {
          this.dropdownDestinationIsValid.set(isValid);
     }

     checkForTransferFeeAndTransferFlag = computed(() => {
          const transferFee = this.nftCreateStoreService.transferFee();
          if (transferFee && transferFee > 0 && !this.nftUtilService.nftFlags().transferableNft) {
               return true;
          } else if (!transferFee && transferFee <= 0 && this.nftUtilService.nftFlags().transferableNft) {
               return true;
          }
          return false;
     });

     isNftSellExpirationValid = computed(() => {
          const expiration = this.nftCreateStoreService.expiration();
          return this.expirationValidator.isValid(expiration);
     });

     hasInvalidNftSellExpiration = computed(() => {
          const sellEnabled = this.nftCreateStoreService.enableSellOnNftCreation();
          const expEnabled = this.nftCreateStoreService.enableExpirationDate();
          const expiration = this.nftCreateStoreService.expiration();

          if (!sellEnabled || !expEnabled || !expiration) return false;

          // Force real-time check
          const secondsRemaining = this.realTimeService.nftOfferSecondsRemaining?.() ?? 999;
          const isExpired = secondsRemaining <= 0;

          return isExpired;
     });

     getNftOfferExpirationErrorMessage = computed(() => {
          if (!this.hasInvalidNftSellExpiration()) return '';

          const timeRemaining = this.realTimeService.nftOfferTimeRemaining?.() || 'Expired';
          return timeRemaining === 'Expired' ? 'NFT Offer has expired. Please select a future date and time.' : `Expiration is invalid (${timeRemaining}).`;
     });

     // Get all validation error messages
     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const taxonError = this.getTaxonErrorMessage();
          if (taxonError) errors.push(`${taxonError}`);

          const nftMinterError = this.getNftMinterErrorMessage();
          if (nftMinterError) errors.push(`${nftMinterError}`);

          const nftOwnerError = this.getNftOwnerErrorMessage();
          if (nftOwnerError) errors.push(`${nftOwnerError}`);

          const transferFeeError = this.getTransferFeeErrorMessage();
          if (transferFeeError) errors.push(`${transferFeeError}`);

          const uriError = this.getUriErrorMessage();
          if (uriError) errors.push(`${uriError}`);

          const nftTokenIdError = this.getNftTokenIdErrorMessage();
          if (nftTokenIdError) errors.push(`${nftTokenIdError}`);

          const destError = this.getDestinationErrorMessage();
          if (destError) errors.push(destError);

          const sellEnabled = this.nftCreateStoreService.enableSellOnNftCreation();
          const hasInvalidExp = this.hasInvalidNftSellExpiration();
          const expError = this.getNftOfferExpirationErrorMessage();
          if (sellEnabled && hasInvalidExp && expError) {
               errors.push(expError);
          }

          const transferFee = this.nftCreateStoreService.transferFee();
          if (transferFee && transferFee > 0 && !this.nftUtilService.nftFlags().transferableNft) {
               errors.push('Transfer Fee requires "Transferable" to be enabled in the flags section.');
          } else if (!transferFee && transferFee <= 0 && this.nftUtilService.nftFlags().transferableNft) {
               errors.push('"Transferable" flag requires Transfer Fee to be valid.');
          }

          return errors;
     });

     clearField(field: 'taxon' | 'transferFee' | 'nftId' | 'nftOwnerAddress' | 'nfTokenMinterAddress') {
          this.nftCreateStoreService.setField(field, null as any);
     }
}
