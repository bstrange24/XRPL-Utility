import { Injectable } from '@angular/core';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../util-service/utils.service';
import { StorageService } from '../../local-storage/storage.service';
import { WalletManagerService } from '../manager/wallet-manager.service';
import * as xrpl from 'xrpl';

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

     async deriveWalletFromFamilySeed(client: xrpl.Client, encryptionType: string, seed: string, destinations: any, customDestinations: any) {
          try {
               const wallet = await this.xrplService.deriveWalletFromFamilySeed(seed, encryptionType);

               // Return error if the wallet already exist in the application. We do not want duplicate wallets.
               customDestinations = this.checkIfWalletAlreadyExist(destinations, wallet, customDestinations);

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

               await this.xrplService.getAccountInfo(client, wallet.address, 'validated', '');

               // Persist and notify
               this.walletManager.addWallet(newWalletEntry); // ← uses shared service
               return { wallet, destinations, customDestinations };
          } catch (error: any) {
               throw new Error(error.message);
          }
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

     async deriveWalletFromMnemonic(client: xrpl.Client, encryptionType: string, seed: string, destinations: any, customDestinations: any) {
          const wallet = await this.xrplService.deriveWalletFromMnemonic(seed, encryptionType);

          // Return error if the wallet already exist in the application. We do not want duplicate wallets.
          customDestinations = this.checkIfWalletAlreadyExist(destinations, wallet, customDestinations);

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

          await this.xrplService.getAccountInfo(client, wallet.address, 'validated', '');

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return { wallet, destinations, customDestinations };
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

     async deriveWalletFromSecretNumbers(client: xrpl.Client, encryptionType: string, seed: any, destinations: any, customDestinations: any) {
          const wallet = await this.xrplService.deriveWalletFromSecretNumbers(seed, encryptionType);

          customDestinations = this.checkIfWalletAlreadyExist(destinations, wallet, customDestinations);

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

          await this.xrplService.getAccountInfo(client, wallet.address, 'validated', '');

          // Persist and notify
          this.walletManager.addWallet(newWalletEntry); // ← uses shared service
          return { wallet, destinations, customDestinations };
     }

     private checkIfWalletAlreadyExist(destinations: any, wallet: any, customDestinations: any) {
          for (let i = destinations.length - 1; i >= 0; i--) {
               console.log(`Destinations: ${destinations[i].address} wallet.address: ${wallet.address}`);
               if (destinations[i].address === wallet.address) {
                    // Remove from user entered wallet addresses since we have the actual wallet now and not just the address.
                    if (destinations[i].name?.includes('Custom')) {
                         this.walletManager.deleteWallet(i);
                         customDestinations = customDestinations.filter((dest: { address: any }) => dest.address !== destinations[i].address);
                         this.storageService.set('customDestinations', JSON.stringify(customDestinations));
                         break;
                    }
                    throw new Error(`Wallet already exists in the application.`);
               }
          }
          return customDestinations;
     }
}
