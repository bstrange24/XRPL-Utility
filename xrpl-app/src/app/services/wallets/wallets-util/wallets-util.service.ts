import { computed, inject, Injectable } from '@angular/core';
import { WalletsStoreService } from '../wallets-store/wallets-store.service';
import { AppConstants } from '../../../core/app.constants';
import { UtilsService } from '../../utils/util-service/utils.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import * as xrpl from 'xrpl';
import * as bip39 from 'bip39';
import { ToastService } from '../../utils/toast/toast.service';

@Injectable({
     providedIn: 'root',
})
export class WalletsUtilService {
     public readonly walletsStoreService = inject(WalletsStoreService);
     public readonly utilsService = inject(UtilsService);
     private readonly storageService = inject(StorageService);
     private readonly toastService = inject(ToastService);

     get isAnyButtonLoading(): boolean {
          return Object.values(this.walletsStoreService.buttonLoading()).includes(true);
     }

     statusMessage = computed(() => {
          if (this.walletsStoreService.mnemonicValid()) {
               return '✅ Mnemonic Valid';
          }

          const error = this.walletsStoreService.errorMessage();
          return error ? `❌ ${error}` : '❌ Invalid Mnemonic';
     });

     getEncryptionType(): string {
          if (this.walletsStoreService.secp256k1_encryption_type()) {
               return AppConstants.ENCRYPTION.SECP256K1;
          }
          return AppConstants.ENCRYPTION.ED25519;
     }

     onEncryptionChange() {
          this.storageService.setInputValue('encryptionType', this.walletsStoreService.encryptionType.toString());
     }

     onMnemonicInput() {
          this.walletsStoreService.setField('mnemonicInput', this.normalizeMnemonic(this.walletsStoreService.mnemonic()));

          if (!/^[a-z]+( [a-z]+)*$/.test(this.walletsStoreService.mnemonic())) {
               this.walletsStoreService.setField('errorMessage', 'Invalid Mnemonic. Must contain lowercase words separated by single spaces only.');
          }

          if (!bip39.validateMnemonic(this.walletsStoreService.mnemonic())) {
               this.walletsStoreService.setField('errorMessage', 'Invalid BIP39 Mnemonic.');
          }

          this.walletsStoreService.setField('mnemonicValid', this.isValidMnemonic(this.walletsStoreService.mnemonic()));
     }

     onSecretNumberInput() {
          this.walletsStoreService.setField('secretNumberInput', this.normalizeSecrets(this.walletsStoreService.secretNumbers()));
          this.walletsStoreService.setField('secretNumberValid', this.isValidSecret(this.convertSecretNumberStringToArray(this.walletsStoreService.secretNumbers())));
     }

     onSeedInput() {
          this.walletsStoreService.setField('seedInput', this.normalizeFamilySeed(this.walletsStoreService.seed()));
          this.walletsStoreService.setField('seedValid', xrpl.isValidSecret(this.walletsStoreService.seed()));
     }

     setEncryption(type: 'ed25519' | 'secp256k1') {
          if (type === 'ed25519') {
               this.walletsStoreService.setField('ed25519_encryption_type', true);
               this.walletsStoreService.setField('secp256k1_encryption_type', false);
          } else {
               this.walletsStoreService.setField('ed25519_encryption_type', false);
               this.walletsStoreService.setField('secp256k1_encryption_type', true);
          }

          this.saveEncryptionPreference();
     }

     onEd25519Change() {
          const isEd25519 = this.walletsStoreService.ed25519_encryption_type();

          if (isEd25519) {
               // Turning ED25519 ON → force SECP off
               this.walletsStoreService.setField('secp256k1_encryption_type', false);
          } else if (!this.walletsStoreService.secp256k1_encryption_type()) {
               // Trying to turn ED25519 OFF → don't allow it unless SECP is already on
               this.walletsStoreService.setField('ed25519_encryption_type', true);
               this.toastService.info('At least one encryption type must be selected', AppConstants.TOAST.INFO);
               return;
          }

          this.saveEncryptionPreference();
     }

     onSecp256k1Change() {
          const isSecp = this.walletsStoreService.secp256k1_encryption_type();

          if (isSecp) {
               // Turning SECP ON → force ED25519 off
               this.walletsStoreService.setField('ed25519_encryption_type', false);
          } else if (!this.walletsStoreService.ed25519_encryption_type()) {
               // Trying to turn SECP OFF → don't allow it unless ED25519 is on
               this.walletsStoreService.setField('secp256k1_encryption_type', true);
               this.toastService.info('At least one encryption type must be selected', AppConstants.TOAST.INFO);
               return;
          }

          this.saveEncryptionPreference();
     }

     private saveEncryptionPreference() {
          const type = this.getEncryptionType();
          this.storageService.setInputValue('encryptionType', type);
     }

     normalizeMnemonic(input: string): string {
          return input.replaceAll(/\s+/g, ' ').trim();
     }

     normalizeSecrets(input: string): string[] {
          return input
               .split(/[\s,]+/)
               .map(s => s.trim())
               .filter(Boolean);
     }

     normalizeFamilySeed(input: string): string {
          if (!input) return '';

          return input
               .trim()
               .replaceAll(/\s+/g, '') // remove all spaces (including pasted line breaks)
               .replaceAll(/[\u200B-\u200D\uFEFF]/g, ''); // remove invisible unicode chars
     }

     isValidSecret(secrets: string[]): boolean {
          const valid: string[] = [];
          const invalid: string[] = [];

          for (const secret of secrets) {
               if (this.isValidSecretNumber(secret.trim())) {
                    valid.push(secret);
               } else {
                    invalid.push(secret);
               }
          }

          if (invalid.length > 0 || valid.length != 8) {
               return false;
          }
          return true;
     }

     isValidMnemonic(mnemonic: string): boolean {
          if (mnemonic === null || mnemonic === undefined || mnemonic === '') {
               return false;
          }

          const cleaned = this.normalizeMnemonic(mnemonic);

          return bip39.validateMnemonic(cleaned);
     }

     isValidSecretNumber(secret: string): boolean {
          return /^\d{6}$/.test(secret);
     }

     convertSecretNumberStringToArray(rawSecrets: string): string[] {
          if (!rawSecrets) {
               return [];
          }

          return rawSecrets
               .split(/[,\s]+/)
               .map(s => s.trim())
               .filter(Boolean);
     }

     truncateAddress(address: string): string {
          return `${address.slice(0, 8)}...${address.slice(-6)}`;
     }
}
