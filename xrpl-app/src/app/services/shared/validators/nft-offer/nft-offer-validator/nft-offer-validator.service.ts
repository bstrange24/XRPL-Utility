import { computed, inject, Injectable } from '@angular/core';
import { CreateNftStoreService } from '../../../../nft/nft-store/nft-store.service';
import { NftUtilService } from '../../../../nft/nft-util/nft-util.service';
import { CurrencyStoreService } from '../../../../currency/currency-store/currency-store.service';
import { RealTimeExpirationService } from '../../../real-time-date-expiration-check/real-time-expiration.service';
import { ExpirationValidatorService } from '../../expiration-validator/expiration-validator.service';

@Injectable({
     providedIn: 'root',
})
export class NftOfferValidatorService {
     public readonly nftCreateStoreService = inject(CreateNftStoreService);
     public readonly nftUtilService = inject(NftUtilService);
     public readonly currencyStoreService = inject(CurrencyStoreService);
     private readonly realTimeService = inject(RealTimeExpirationService);
     private readonly expirationValidator = inject(ExpirationValidatorService);

     // NFT Offer Index Validation
     isNftOfferIndexValid = computed(() => {
          const offerId = this.nftCreateStoreService.nftOfferId();

          if (!offerId || offerId.trim().length === 0) {
               return false;
          }

          const hexRegex = /^[0-9A-Fa-f]{64}$/;
          return hexRegex.test(offerId.trim());
     });

     isNftOfferIndexInvalid = computed(() => {
          const offerId = this.nftCreateStoreService.nftOfferId();

          if (!offerId || offerId.trim().length === 0) {
               return false;
          }

          return !this.isNftOfferIndexValid();
     });

     getNftOfferIndexErrorMessage = computed(() => {
          const offerId = this.nftCreateStoreService.nftOfferId();

          if (!offerId || offerId.trim().length === 0) {
               return '';
          }

          if (offerId.trim().length !== 64) {
               return `NFT Offer Index must be exactly 64 characters (current: ${offerId.trim().length} characters).`;
          }

          if (!this.isNftOfferIndexValid()) {
               return 'NFT Offer Index must be a valid 64-character hexadecimal string (0-9, A-F).';
          }

          return '';
     });

     // NFT Token ID Validation
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

     // Amount Validation
     isAmountValid = computed(() => {
          const amount = this.nftCreateStoreService.amount();

          if (!amount || amount.trim().length === 0) {
               return false;
          }

          const numAmount = Number(amount);
          if (Number.isNaN(numAmount) || numAmount <= 0) {
               return false;
          }

          // Check balance for XRP or token
          const currency = this.currencyStoreService.currency();
          const balance = this.currencyStoreService.balance();

          if (currency === 'XRP') {
               // Check if user has enough XRP (including fees)
               const fee = 0.000012; // Approximate fee for NFT offer
               if (numAmount + fee > Number(balance)) {
                    return false;
               }
          }

          return true;
     });

     isAmountInvalid = computed(() => {
          const amount = this.nftCreateStoreService.amount();

          if (!amount || amount.trim().length === 0) {
               return '';
          }

          return !this.isAmountValid();
     });

     getAmountErrorMessage = computed(() => {
          const amount = this.nftCreateStoreService.amount();
          const currency = this.currencyStoreService.currency();
          const balance = this.currencyStoreService.balance();

          if (!amount || amount.trim().length === 0) {
               return '';
          }

          const numAmount = Number(amount);
          if (Number.isNaN(numAmount)) {
               return 'Amount must be a valid number.';
          }

          if (numAmount <= 0) {
               return 'Amount must be greater than 0.';
          }

          if (currency === 'XRP') {
               const fee = 0.000012;
               if (numAmount + fee > Number(balance)) {
                    return `Insufficient balance. You have ${Number(balance).toFixed(6)} XRP available. Need ${(numAmount + fee).toFixed(6)} XRP (including fees).`;
               }
          }

          return '';
     });

     isNftSellExpirationValid = computed(() => {
          const expiration = this.nftCreateStoreService.expiration();
          return this.expirationValidator.isValid(expiration);
     });

     hasInvalidNftSellExpiration = computed(() => {
          const sellEnabled = true;
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

     // Currency Validation
     isCurrencyValid = computed(() => {
          const currency = this.currencyStoreService.currency();
          return !!currency && currency.trim().length > 0;
     });

     // Get all validation error messages
     getAllValidationErrors = computed(() => {
          const errors: string[] = [];

          const nftIdError = this.getNftTokenIdErrorMessage();
          if (nftIdError) errors.push(`${nftIdError}`);

          const amountError = this.getAmountErrorMessage();
          if (amountError) errors.push(`${amountError}`);

          const offerIndexError = this.getNftOfferIndexErrorMessage();
          if (offerIndexError) errors.push(`${offerIndexError}`);

          const hasInvalidExp = this.hasInvalidNftSellExpiration();
          const expError = this.getNftOfferExpirationErrorMessage();
          if (hasInvalidExp && expError) {
               errors.push(expError);
          }

          if (!this.isCurrencyValid()) {
               errors.push('Currency: Please select a currency.');
          }

          return errors;
     });

     clearField(field: 'taxon' | 'transferFee' | 'nftId' | 'nftOwnerAddress' | 'nfTokenMinterAddress') {
          this.nftCreateStoreService.setField(field, null as any);
     }
}
