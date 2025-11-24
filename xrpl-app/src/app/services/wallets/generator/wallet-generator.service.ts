import { Injectable } from '@angular/core';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../util-service/utils.service';
import { StorageService } from '../../local-storage/storage.service';
import { WalletManagerService } from '../manager/wallet-manager.service';

@Injectable({
     providedIn: 'root',
})
export class WalletGeneratorService {
     constructor(private xrplService: XrplService, private utilsService: UtilsService, private storageService: StorageService, private walletManager: WalletManagerService) {}

     /**
      * Generates a new wallet from family seed and adds it to the wallets array.
      * @param wallets Current array of wallets (passed by reference)
      * @param environment Current network (testnet/mainnet)
      * @param encryptionType Encryption method
      * @param emitChange Callback to emit wallet list changes
      * @returns The newly created wallet
      */
     async generateNewAccount(wallets: any[], environment: string, encryptionType: string): Promise<any> {
          console.log('encryptionType ________________________________________________', encryptionType);
          const wallet = await this.xrplService.generateWalletFromFamilySeed(environment, encryptionType);

          // Optional delay (e.g. for faucet)
          await this.utilsService.sleep(5000);
          console.log('Generated wallet:', wallet);

          // Get current wallets to calculate next name
          const currentWallets = this.walletManager.getWallets();
          const nextIndex = currentWallets.length + 1;

          // Initialize or update wallet entry
          const newWalletEntry = {
               address: wallet.address,
               classicAddress: wallet.address,
               seed: wallet.secret.familySeed || '',
               mnemonic: '',
               secretNumbers: '',
               encryptionAlgorithm: wallet.keypair.algorithm || '',
               name: `Wallet ${nextIndex}`, // ← AUTO NAME
          };

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return wallet;
     }

     async deriveWalletFromFamilySeed(wallets: any[], environment: string, encryptionType: string, seed: string, destinations: any, customDestinations: any) {
          const wallet = await this.xrplService.deriveWalletFromFamilySeed(seed, encryptionType);

          // Get current wallets to calculate next name
          const currentWallets = this.walletManager.getWallets();
          const nextIndex = currentWallets.length + 1;

          // Initialize or update wallet entry
          const newWalletEntry = {
               address: wallet.address,
               classicAddress: wallet.address,
               seed: wallet.secret.familySeed || '',
               mnemonic: '',
               secretNumbers: '',
               encryptionAlgorithm: wallet.keypair.algorithm || '',
               name: `Wallet ${nextIndex}`, // ← AUTO NAME
          };

          // // Return null if the wallet already exist in the application. We do not want duplicate wallets.
          // for (let i = destinations.length - 1; i >= 0; i--) {
          //      if (destinations[i].address === newWalletEntry.address) {
          //           // Remove from user entered wallet addresses since we have the actual wallet now and not just the address.
          //           if (destinations[i].name.includes('Custom')) {
          //                this.walletManager.deleteWallet(i);
          //                customDestinations = customDestinations.filter((dest: { address: any }) => dest.address !== destinations[i].address);
          //                break;
          //           }
          //           return null;
          //      }
          // }

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return wallet;
     }

     /**
      * Generates a new wallet from Mnemonic and adds it to the wallets array.
      * @param wallets Current array of wallets (passed by reference)
      * @param environment Current network (testnet/mainnet)
      * @param encryptionType Encryption method
      * @param emitChange Callback to emit wallet list changes
      * @returns The newly created wallet
      */
     async generateNewWalletFromMnemonic(wallets: any[], environment: string, encryptionType: string): Promise<any> {
          console.log('encryptionType ________________________________________________', encryptionType);
          const wallet = await this.xrplService.generateWalletFromMnemonic(environment, encryptionType);

          // Optional delay (e.g. for faucet)
          await this.utilsService.sleep(5000);
          console.log('Generated wallet:', wallet);

          // Get current wallets to calculate next name
          const currentWallets = this.walletManager.getWallets();
          const nextIndex = currentWallets.length + 1;

          // Initialize or update wallet entry
          const newWalletEntry = {
               address: wallet.address,
               classicAddress: wallet.address,
               seed: wallet.secret.mnemonic || '',
               mnemonic: wallet.secret.mnemonic,
               secretNumbers: '',
               encryptionAlgorithm: wallet.keypair.algorithm || '',
               name: `Wallet ${nextIndex}`, // ← AUTO NAME
          };

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return wallet;
     }

     async deriveWalletFromMnemonic(wallets: any[], environment: string, encryptionType: string, seed: string) {
          const wallet = await this.xrplService.deriveWalletFromMnemonic(seed, encryptionType);

          // Get current wallets to calculate next name
          const currentWallets = this.walletManager.getWallets();
          const nextIndex = currentWallets.length + 1;

          // Initialize or update wallet entry
          const newWalletEntry = {
               address: wallet.address,
               classicAddress: wallet.address,
               seed: wallet.secret.mnemonic || '',
               mnemonic: wallet.secret.mnemonic,
               secretNumbers: '',
               encryptionAlgorithm: wallet.keypair.algorithm || '',
               name: `Wallet ${nextIndex}`, // ← AUTO NAME
          };

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return wallet;
     }

     /**
      * Generates a new wallet from SecretNumbers and adds it to the wallets array.
      * @param wallets Current array of wallets (passed by reference)
      * @param environment Current network (testnet/mainnet)
      * @param encryptionType Encryption method
      * @param emitChange Callback to emit wallet list changes
      * @returns The newly created wallet
      */
     async generateNewWalletFromSecretNumbers(wallets: any[], environment: string, encryptionType: string): Promise<any> {
          console.log('encryptionType ________________________________________________', encryptionType);
          const wallet = await this.xrplService.generateWalletFromSecretNumbers(environment, encryptionType);

          // Optional delay (e.g. for faucet)
          await this.utilsService.sleep(5000);
          console.log('Generated wallet:', wallet);

          // Get current wallets to calculate next name
          const currentWallets = this.walletManager.getWallets();
          const nextIndex = currentWallets.length + 1;

          // Initialize or update wallet entry
          const newWalletEntry = {
               address: wallet.address,
               classicAddress: wallet.address,
               seed: wallet.secret.familySeed || '',
               mnemonic: '',
               secretNumbers: wallet.secret.secretNumbers,
               encryptionAlgorithm: wallet.keypair.algorithm || '',
               // algorithm: encryptionType ? encryptionType : '',
               name: `Wallet ${nextIndex}`, // ← AUTO NAME
          };

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return wallet;
     }

     async deriveWalletFromSecretNumbers(wallets: any[], environment: string, encryptionType: string, seed: any) {
          const wallet = await this.xrplService.deriveWalletFromSecretNumbers(seed, encryptionType);

          // Get current wallets to calculate next name
          const currentWallets = this.walletManager.getWallets();
          const nextIndex = currentWallets.length + 1;

          // Initialize or update wallet entry
          const newWalletEntry = {
               address: wallet.address,
               classicAddress: wallet.address,
               seed: wallet.secret.familySeed || '',
               mnemonic: '',
               secretNumbers: wallet.secret.secretNumbers,
               encryptionAlgorithm: wallet.keypair.algorithm || '',
               name: `Wallet ${nextIndex}`, // ← AUTO NAME
          };

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return wallet;
     }

     async deleteWallet(index: any) {
          this.walletManager.deleteWallet(index);
     }
}
