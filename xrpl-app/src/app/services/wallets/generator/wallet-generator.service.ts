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
      * Generates a new wallet and adds it to the wallets array.
      * @param wallets Current array of wallets (passed by reference)
      * @param environment Current network (testnet/mainnet)
      * @param encryptionType Encryption method
      * @param emitChange Callback to emit wallet list changes
      * @returns The newly created wallet
      */
     async generateNewAccount(wallets: any[], environment: string, encryptionType: string): Promise<any> {
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
}
