import { computed, inject, Injectable } from '@angular/core';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { WalletsStoreService } from '../wallets-store/wallets-store.service';
import { AppConstants } from '../../../core/app.constants';
import { UtilsService } from '../../util-service/utils.service';
import { StorageService } from '../../local-storage/storage.service';
import * as xrpl from 'xrpl';
import * as bip39 from 'bip39';
import { ToastService } from '../../toast/toast.service';


@Injectable({
  providedIn: 'root',
})
export class WalletsUtilService {
       public readonly walletsStoreService = inject(WalletsStoreService);
            public readonly utilsService = inject(UtilsService);
                 private readonly storageService = inject(StorageService);
                 private readonly toastService = inject(ToastService);
                 
            
       
  

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
          return AppConstants.ENCRYPTION.ED25519; // Default if neither or only ed25519 checked
     }

     onEncryptionChange() {
          this.storageService.setInputValue('encryptionType', this.walletsStoreService.encryptionType.toString());
     }

     onMnemonicInput() {
          this.walletsStoreService.setField('mnemonicInput', this.utilsService.normalizeMnemonic(this.walletsStoreService.mnemonic()));

          if (!/^[a-z]+( [a-z]+)*$/.test(this.walletsStoreService.mnemonic())) {
               this.walletsStoreService.setField('errorMessage', 'Invalid Mnemonic. Must contain lowercase words separated by single spaces only.');
          }

          if (!bip39.validateMnemonic(this.walletsStoreService.mnemonic())) {
               this.walletsStoreService.setField('errorMessage','Invalid BIP39 Mnemonic.');
          }

          this.walletsStoreService.setField('mnemonicValid', this.utilsService.isValidMnemonic(this.walletsStoreService.mnemonic()));
     }

     onSecretNumberInput() {
          this.walletsStoreService.setField('secretNumberInput', this.utilsService.normalizeSecrets(this.walletsStoreService.secretNumbers()));
          this.walletsStoreService.setField('secretNumberValid', this.utilsService.isValidSecret(this.utilsService.convertSecretNumberStringToArray(this.walletsStoreService.secretNumbers())));
     }

     onSeedInput() {
          this.walletsStoreService.setField('seedInput', this.utilsService.normalizeFamilySeed(this.walletsStoreService.seed()));
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

}
