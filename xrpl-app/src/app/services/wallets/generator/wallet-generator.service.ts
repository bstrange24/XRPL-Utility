import { Injectable } from '@angular/core';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../util-service/utils.service';
import { StorageService } from '../../local-storage/storage.service';
import { WalletManagerService } from '../manager/wallet-manager.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as xrpl from 'xrpl';

@Injectable({
     providedIn: 'root',
})
export class WalletGeneratorService {
     constructor(private xrplService: XrplService, private utilsService: UtilsService, private readonly http: HttpClient, private storageService: StorageService, private walletManager: WalletManagerService) {}

     private readonly proxyServer = 'http://localhost:3000';

     /**
      * Generates a new wallet from family seed and adds it to the wallets array.
      * @param wallets Current array of wallets (passed by reference)
      * @param environment Current network (testnet/mainnet)
      * @param encryptionType Encryption method
      * @param emitChange Callback to emit wallet list changes
      * @returns The newly created wallet
      */
     async generateNewAccount(wallets: any[], environment: string, encryptionType: string): Promise<any> {
          console.log('encryptionType: ', encryptionType);
          const wallet = await this.generateWalletFromFamilySeed(environment, encryptionType);

          // Delay (e.g. for faucet)
          await this.utilsService.sleep(6000);
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

     /**
      * Derives a wallet from a family seed and adds it to the application
      * @param client - XRPL client instance
      * @param encryptionType - Encryption algorithm type
      * @param seed - Family seed for wallet derivation
      * @param destinations - Current destination wallets
      * @param customDestinations - Custom destination configurations
      * @returns Object containing derived wallet and updated destinations
      * @throws Error if wallet derivation or account validation fails
      */
     async deriveWalletFromFamilySeed(client: xrpl.Client, encryptionType: string, seed: string, destinations: any, customDestinations: any) {
          try {
               const wallet = await this.deriveFromFamilySeed(seed, encryptionType);

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
          console.log('encryptionType:', encryptionType);
          const wallet = await this.generateWalletFromMnemonic(environment, encryptionType);

          // Optional delay (e.g. for faucet)
          await this.utilsService.sleep(6000);
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

     /**
      * Derives a wallet from a mnemonic phrase and adds it to the application
      * @param client - XRPL client instance for network operations
      * @param encryptionType - Encryption algorithm type for key derivation
      * @param seed - Mnemonic phrase for wallet derivation
      * @param destinations - Current destination wallets for duplicate checking
      * @param customDestinations - Custom destination configurations
      * @returns Object containing derived wallet and updated destinations
      * @throws Error if wallet derivation fails or account validation fails
      */
     async deriveWalletFromMnemonic(client: xrpl.Client, encryptionType: string, seed: string, destinations: any, customDestinations: any) {
          const wallet = await this.deriveFromMnemonic(seed, encryptionType);

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
          console.log('encryptionType: ', encryptionType);
          const wallet = await this.generateWalletFromSecretNumbers(environment, encryptionType);

          // Optional delay (e.g. for faucet)
          await this.utilsService.sleep(6000);
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

     /**
      * Derives a wallet from secret numbers and adds it to the application
      * @param client - XRPL client instance for network operations
      * @param encryptionType - Encryption algorithm type for key derivation
      * @param seed - Secret numbers array for wallet derivation
      * @param destinations - Current destination wallets for duplicate checking
      * @param customDestinations - Custom destination configurations
      * @returns Object containing derived wallet and updated destinations
      * @throws Error if wallet derivation fails or account validation fails
      */
     async deriveWalletFromSecretNumbers(client: xrpl.Client, encryptionType: string, seed: any, destinations: any, customDestinations: any) {
          const wallet = await this.deriveFromSecretNumbers(seed, encryptionType);

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

     /**
      * Checks if a wallet already exists in destinations and handles duplicates
      * @param destinations - Array of existing destination wallets
      * @param wallet - New wallet to check for duplicates
      * @param customDestinations - Custom destination configurations
      * @returns Updated customDestinations array if custom wallet was removed
      * @throws Error if non-custom duplicate wallet is found
      */
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

     // Generate account from Family Seed
     async generateWalletFromFamilySeed(environment: string, algorithm: string = 'ed25519') {
          const url = `${this.proxyServer}/api/create-wallet/family-seed/`;
          const wallet = await firstValueFrom(this.http.post<any>(url, { environment, algorithm }));
          return wallet;
     }

     // Derive account from Family Seed
     async deriveFromFamilySeed(familySeed: string, algorithm: string = 'ed25519') {
          const url = `${this.proxyServer}/api/derive/family-seed/${encodeURIComponent(familySeed)}?algorithm=${encodeURIComponent(algorithm)}`;
          console.log(`deriveFromFamilySeed ${url}`);
          console.log(`deriveFromFamilySeed with ${familySeed} familySeed`);
          const wallet = await firstValueFrom(this.http.get<any>(url));
          return wallet;
     }

     // Generate account from Mnemonic
     async generateWalletFromMnemonic(environment: string, algorithm: string = 'ed25519') {
          const url = `${this.proxyServer}/api/create-wallet/mnemonic/`;
          const body = { environment, algorithm };
          const wallet = await firstValueFrom(this.http.post<any>(url, body));
          return wallet;
     }

     // Derive account from Mnemonic
     async deriveFromMnemonic(mnemonic: string, algorithm: string = 'ed25519') {
          const url = `${this.proxyServer}/api/derive/mnemonic/${encodeURIComponent(mnemonic)}?algorithm=${encodeURIComponent(algorithm)}`;
          console.log(`deriveFromMnemonic ${url}`);
          console.log(`deriveFromMnemonic with ${mnemonic} mnemonic`);
          const wallet = await firstValueFrom(this.http.get<any>(url));
          return wallet;
     }

     // Generate account from Secret Numbers
     async generateWalletFromSecretNumbers(environment: string, algorithm: string = 'ed25519') {
          const url = `${this.proxyServer}/api/create-wallet/secret-numbers/`;
          const body = { environment, algorithm };
          const wallet = await firstValueFrom(this.http.post<any>(url, body));
          return wallet;
     }

     // Derive account from Secret Numbers
     async deriveFromSecretNumbers(secretNumbers: string[], algorithm: string = 'ed25519') {
          const url = `${this.proxyServer}/api/derive/secretNumbers`;
          console.log(`deriveFromSecretNumbers ${url}`);
          console.log(`deriveFromSecretNumbers with ${secretNumbers} ${secretNumbers.length} numbers`);
          const body = { secretNumbers: secretNumbers, algorithm: algorithm };
          const wallet = await firstValueFrom(this.http.post<any>(url, body));
          return wallet;
     }

     async fundWalletFromFaucet(wallet: xrpl.Wallet | { secret?: { familySeed?: string } }, environment: string) {
          if (environment !== 'mainnet') {
               try {
                    const client = await this.xrplService.getClient();

                    // If wallet is not already an xrpl.Wallet, convert it
                    let xrplWallet: xrpl.Wallet;
                    if (wallet instanceof xrpl.Wallet) {
                         xrplWallet = wallet;
                    } else if (wallet && typeof wallet === 'object' && wallet.secret?.familySeed) {
                         xrplWallet = xrpl.Wallet.fromSeed(wallet.secret.familySeed);
                    } else {
                         throw new Error('Unsupported wallet type for funding');
                    }

                    // Call faucet
                    const faucetResult = await client.fundWallet(xrplWallet);
                    console.log('Faucet result:', faucetResult);
                    return faucetResult;
               } catch (error) {
                    console.error('Funding failed:', error);
                    throw error;
               }
          }
          return null;
     }
}
