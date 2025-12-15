import { Injectable } from '@angular/core';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../../util-service/utils.service';
import { StorageService } from '../../local-storage/storage.service';
import { WalletManagerService } from '../manager/wallet-manager.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import * as xrpl from 'xrpl';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import { Wallet } from 'xrpl';
import { AppConstants } from '../../../core/app.constants';

@Injectable({
     providedIn: 'root',
})
export class WalletGeneratorService {
     constructor(private xrplService: XrplService, private utilsService: UtilsService, private readonly http: HttpClient, private storageService: StorageService, private walletManager: WalletManagerService, private xrplCache: XrplCacheService) {}

     private readonly proxyServer = 'http://localhost:3000';

     private async getClient(): Promise<xrpl.Client> {
          return this.xrplCache.getClient(() => this.xrplService.getClient());
     }

     /**
      * Generates a new wallet from family seed and adds it to the wallets array.
      * @param wallets Current array of wallets (passed by reference)
      * @param environment Current network (testnet/mainnet)
      * @param encryptionType Encryption method
      * @param emitChange Callback to emit wallet list changes
      * @returns The newly created wallet
      */
     async generateNewAccount(wallets: any[], environment: string, encryptionType: string): Promise<any> {
          console.log('Entering generateNewAccount');
          const startTime = Date.now();
          try {
               console.log('encryptionType: ', encryptionType);
               let wallet;
               let newWalletEntry;
               try {
                    // Trying to fund from local host service
                    wallet = await this.generateWalletFromFamilySeed(environment, encryptionType);

                    // Delay (e.g. for faucet)
                    await this.utilsService.sleep(6000);
                    console.log('Generated wallet:', wallet);

                    // Get current wallets to calculate next name
                    const currentWallets = this.walletManager.getWallets();
                    const nextIndex = currentWallets.length + 1;

                    // Initialize or update wallet entry
                    newWalletEntry = {
                         address: wallet.address,
                         classicAddress: wallet.address,
                         seed: wallet.secret.familySeed || '',
                         mnemonic: '',
                         secretNumbers: '',
                         encryptionAlgorithm: wallet.keypair.algorithm || '',
                         name: `Wallet ${nextIndex}`, // ← AUTO NAME
                    };
               } catch (error) {
                    // If local host fails use the xrpl facuet
                    wallet = await this.createAndFundWalletWithXrplClient();

                    // Delay (e.g. for faucet)
                    await this.utilsService.sleep(6000);
                    console.log('Generated wallet:', wallet.wallet.classicAddress);

                    // Get current wallets to calculate next name
                    const currentWallets = this.walletManager.getWallets();
                    const nextIndex = currentWallets.length + 1;

                    // Initialize or update wallet entry
                    newWalletEntry = {
                         address: wallet.wallet.classicAddress,
                         classicAddress: wallet.wallet.classicAddress,
                         seed: wallet.wallet.seed || '',
                         mnemonic: '',
                         secretNumbers: '',
                         encryptionAlgorithm: AppConstants.ENCRYPTION.ED25519,
                         name: `Wallet ${nextIndex}`, // ← AUTO NAME
                    };
               }

               // Persist and notify
               this.walletManager.addWallet(newWalletEntry); // ← uses shared service
               return wallet;
          } catch (error: any) {
               console.error('Error in generateNewAccount:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateNewAccount in ${executionTime}ms`);
          }
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
     async deriveWalletFromFamilySeed(client: xrpl.Client, seed: string, destinations: any, customDestinations: any) {
          console.log('Entering deriveWalletFromFamilySeed');
          const startTime = Date.now();
          try {
               const wallet = await this.deriveFromFamilySeed(seed, AppConstants.ENCRYPTION.ED25519);
               // Return error if the wallet already exist in the application. We do not want duplicate wallets.
               customDestinations = this.checkIfWalletAlreadyExist(destinations, wallet, customDestinations);

               const walletSecp = await this.deriveFromFamilySeed(seed, AppConstants.ENCRYPTION.SECP256K1);
               // Return error if the wallet already exist in the application. We do not want duplicate wallets.
               customDestinations = this.checkIfWalletAlreadyExist(destinations, walletSecp, customDestinations);

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
               console.error('Error in deriveWalletFromFamilySeed:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveWalletFromFamilySeed in ${executionTime}ms`);
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
          console.log('Entering generateNewWalletFromMnemonic');
          const startTime = Date.now();
          try {
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
          } catch (error: any) {
               console.error('Error in generateNewWalletFromMnemonic:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateNewWalletFromMnemonic in ${executionTime}ms`);
          }
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
     async deriveWalletFromMnemonic(client: xrpl.Client, seed: string, destinations: any, customDestinations: any) {
          console.log('Entering deriveWalletFromMnemonic');
          const startTime = Date.now();
          try {
               const wallet = await this.deriveFromMnemonic(seed, AppConstants.ENCRYPTION.SECP256K1);
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
          } catch (error: any) {
               console.error('Error in deriveWalletFromMnemonic:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveWalletFromMnemonic in ${executionTime}ms`);
          }
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
          console.log('Entering generateNewWalletFromSecretNumbers');
          const startTime = Date.now();
          try {
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
          } catch (error: any) {
               console.error('Error in generateNewWalletFromSecretNumbers:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateNewWalletFromSecretNumbers in ${executionTime}ms`);
          }
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
     async deriveWalletFromSecretNumbers(client: xrpl.Client, seed: any, destinations: any, customDestinations: any) {
          console.log('Entering deriveWalletFromSecretNumbers');
          const startTime = Date.now();
          try {
               const wallet = await this.deriveFromSecretNumbers(seed, AppConstants.ENCRYPTION.SECP256K1);
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
                    secretNumbers: wallet.secret.secretNumbers,
                    encryptionAlgorithm: wallet.keypair.algorithm || '',
                    name: `Wallet ${nextIndex}`, // ← AUTO NAME
               };

               await this.xrplService.getAccountInfo(client, wallet.address, 'validated', '');

               // Persist and notify
               this.walletManager.addWallet(newWalletEntry); // ← uses shared service
               return { wallet, destinations, customDestinations };
          } catch (error: any) {
               console.error('Error in deriveWalletFromSecretNumbers:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveWalletFromSecretNumbers in ${executionTime}ms`);
          }
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
                    throw new Error(`Wallet already exists in the application with ${wallet.keypair.algorithm} encryption.`);
               }
          }
          return customDestinations;
     }

     async createAndFundWalletWithXrplClient() {
          try {
               const client = this.getClient();
               // Generate new wallet
               const wallet = Wallet.generate();
               console.log(`Generated wallet: ${wallet.address}`);

               let funded = false;

               const fundResult = await (await client).fundWallet(wallet);
               console.log(`Funded ${fundResult} XRP to ${wallet.address}`);
               funded = true;

               return {
                    wallet,
                    funded,
               };
          } catch (error) {
               console.error('Error creating/funding wallet:', error);
               throw error;
          }
     }

     // Generate account from Family Seed
     async generateWalletFromFamilySeed(environment: string, algorithm: string = 'ed25519') {
          console.log('Entering generateWalletFromFamilySeed');
          const startTime = Date.now();
          try {
               const url = `${this.proxyServer}/api/create-wallet/family-seed/`;
               const wallet = await firstValueFrom(this.http.post<any>(url, { environment, algorithm }));
               return wallet;
          } catch (error: any) {
               console.error('Error in generateWalletFromFamilySeed:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateWalletFromFamilySeed in ${executionTime}ms`);
          }
     }

     // Derive account from Family Seed
     async deriveFromFamilySeed(familySeed: string, algorithm: string = 'ed25519') {
          console.log('Entering deriveFromFamilySeed');
          const startTime = Date.now();
          try {
               const url = `${this.proxyServer}/api/derive/family-seed/${encodeURIComponent(familySeed)}?algorithm=${encodeURIComponent(algorithm)}`;
               console.log(`deriveFromFamilySeed ${url}`);
               console.log(`deriveFromFamilySeed with ${familySeed} familySeed`);
               const wallet = await firstValueFrom(this.http.get<any>(url));
               return wallet;
          } catch (error: any) {
               console.error('Error in deriveFromFamilySeed:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveFromFamilySeed in ${executionTime}ms`);
          }
     }

     // Generate account from Mnemonic
     async generateWalletFromMnemonic(environment: string, algorithm: string = 'ed25519') {
          console.log('Entering generateWalletFromMnemonic');
          const startTime = Date.now();
          try {
               const url = `${this.proxyServer}/api/create-wallet/mnemonic/`;
               const body = { environment, algorithm };
               const wallet = await firstValueFrom(this.http.post<any>(url, body));
               return wallet;
          } catch (error: any) {
               console.error('Error in generateWalletFromMnemonic:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateWalletFromMnemonic in ${executionTime}ms`);
          }
     }

     // Derive account from Mnemonic
     async deriveFromMnemonic(mnemonic: string, algorithm: string = 'ed25519') {
          console.log('Entering deriveFromMnemonic');
          const startTime = Date.now();
          try {
               const url = `${this.proxyServer}/api/derive/mnemonic/${encodeURIComponent(mnemonic)}?algorithm=${encodeURIComponent(algorithm)}`;
               console.log(`deriveFromMnemonic ${url}`);
               console.log(`deriveFromMnemonic with ${mnemonic} mnemonic`);
               const wallet = await firstValueFrom(this.http.get<any>(url));
               return wallet;
          } catch (error: any) {
               console.error('Error in deriveFromMnemonic:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveFromMnemonic in ${executionTime}ms`);
          }
     }

     // Generate account from Secret Numbers
     async generateWalletFromSecretNumbers(environment: string, algorithm: string = 'ed25519') {
          console.log('Entering generateWalletFromSecretNumbers');
          const startTime = Date.now();
          try {
               const url = `${this.proxyServer}/api/create-wallet/secret-numbers/`;
               const body = { environment, algorithm };
               const wallet = await firstValueFrom(this.http.post<any>(url, body));
               return wallet;
          } catch (error: any) {
               console.error('Error in generateWalletFromSecretNumbers:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving generateWalletFromSecretNumbers in ${executionTime}ms`);
          }
     }

     // Derive account from Secret Numbers
     async deriveFromSecretNumbers(secretNumbers: string[], algorithm: string = 'ed25519') {
          console.log('Entering deriveFromSecretNumbers');
          const startTime = Date.now();
          try {
               const url = `${this.proxyServer}/api/derive/secretNumbers`;
               console.log(`deriveFromSecretNumbers ${url}`);
               console.log(`deriveFromSecretNumbers with ${secretNumbers} ${secretNumbers.length} numbers`);
               const body = { secretNumbers: secretNumbers, algorithm: algorithm };
               const wallet = await firstValueFrom(this.http.post<any>(url, body));
               return wallet;
          } catch (error: any) {
               console.error('Error in deriveFromSecretNumbers:', error);
               throw new Error(`${error.message}`);
          } finally {
               const executionTime = (Date.now() - startTime).toString();
               console.log(`Leaving deriveFromSecretNumbers in ${executionTime}ms`);
          }
     }

     async fundWalletFromFaucet(wallet: xrpl.Wallet | { secret?: { familySeed?: string } }, environment: string) {
          console.log('Entering fundWalletFromFaucet');
          const startTime = Date.now();
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
               } catch (error: any) {
                    console.error('Funding failed:', error);
                    throw new Error(`${error.message}`);
               } finally {
                    const executionTime = (Date.now() - startTime).toString();
                    console.log(`Leaving fundWalletFromFaucet in ${executionTime}ms`);
               }
          }
          return null;
     }
}
