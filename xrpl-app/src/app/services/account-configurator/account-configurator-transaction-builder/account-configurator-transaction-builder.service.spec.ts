import { TestBed } from '@angular/core/testing';
import { AccountConfiguratorTransactionBuilderService } from './account-configurator-transaction-builder.service';
import * as xrpl from 'xrpl';
import { AppConstants } from '../../../core/app.constants';

describe('AccountConfiguratorTransactionBuilderService', () => {
     let service: AccountConfiguratorTransactionBuilderService;

     let wallet: any;
     let env: any;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [AccountConfiguratorTransactionBuilderService],
          });

          service = TestBed.inject(AccountConfiguratorTransactionBuilderService);

          wallet = {
               classicAddress: 'rTEST',
          };

          env = {
               fee: '10',
               ledgerInfo: {
                    lastIndex: 100,
               },
          };
     });

     // --------------------------------------------------
     // AccountSet
     // --------------------------------------------------

     it('should build basic AccountSet tx', () => {
          const tx = service.buildModifyAccountSetTransaction(wallet, env, {});

          expect(tx.TransactionType).toBe('AccountSet');
          expect(tx.Account).toBe('rTEST');
          expect(tx.Fee).toBe('10');
          expect(tx.LastLedgerSequence).toBe(100 + AppConstants.LAST_LEDGER_ADD_TIME);
     });

     it('should set NFT minter flag (enableNftMinter = Y)', () => {
          const config = {
               enableNftMinter: 'Y',
               account: { nfTokenMinterAddress: 'rNFT' },
          };

          const tx = service.buildModifyAccountSetTransaction(wallet, env, config);

          expect(tx.NFTokenMinter).toBe('rNFT');
          expect(tx.SetFlag).toBe(xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter);
     });

     it('should clear NFT minter flag (enableNftMinter != Y)', () => {
          const config = {
               enableNftMinter: 'N',
               account: {},
          };

          const tx = service.buildModifyAccountSetTransaction(wallet, env, config);

          expect(tx.ClearFlag).toBe(xrpl.AccountSetAsfFlags.asfAuthorizedNFTokenMinter);
     });

     it('should handle SetFlag operation', () => {
          const config = {
               operation: 'SetFlag',
               flagValue: '5',
          };

          const tx = service.buildModifyAccountSetTransaction(wallet, env, config);

          expect(tx.SetFlag).toBe(5);
     });

     it('should handle ClearFlag operation', () => {
          const config = {
               operation: 'ClearFlag',
               flagValue: '7',
          };

          const tx = service.buildModifyAccountSetTransaction(wallet, env, config);

          expect(tx.ClearFlag).toBe(7);
     });

     // --------------------------------------------------
     // SignerListSet (multi-sign)
     // --------------------------------------------------

     it('should build default SignerListSet', () => {
          const tx = service.buildModifyMultiSignTransaction(wallet, env, {
               account: {},
          });

          expect(tx.TransactionType).toBe('SignerListSet');
          expect(tx.SignerQuorum).toBe(0);
     });

     it('should set signer entries and quorum when enabled', () => {
          const config = {
               account: {
                    enableMultiSignFlag: 'Y',
                    formattedSignerEntries: [{}, {}],
                    signerQuorum: '2',
               },
          };

          const tx = service.buildModifyMultiSignTransaction(wallet, env, config);

          expect(tx.SignerEntries?.length).toBe(2);
          expect(tx.SignerQuorum).toBe(2);
     });

     // --------------------------------------------------
     // SetRegularKey
     // --------------------------------------------------

     it('should build SetRegularKey when enabled', () => {
          const config = {
               enableRegularKeyFlag: 'Y',
               account: {
                    regularKeyAddress: 'rREG',
               },
          };

          const tx = service.buildModifySetRegularKeyTransaction(wallet, env, config);

          expect(tx.RegularKey).toBe('rREG');
     });

     it('should not set RegularKey when disabled', () => {
          const config = {
               enableRegularKeyFlag: 'N',
               account: {},
          };

          const tx = service.buildModifySetRegularKeyTransaction(wallet, env, config);

          expect(tx.RegularKey).toBeUndefined();
     });

     // --------------------------------------------------
     // DepositPreauth
     // --------------------------------------------------

     it('should build DepositPreauth authorize tx', () => {
          const config = {
               authorizeFlag: 'Y',
               destinationAddress: 'rDEST',
          };

          const tx = service.buildModifyDepositAuthTransaction(wallet, env, config);

          expect(tx.Authorize).toBe('rDEST');
          expect(tx.TransactionType).toBe('DepositPreauth');
     });

     it('should build DepositPreauth unauthorize tx', () => {
          const config = {
               authorizeFlag: 'N',
               destinationAddress: 'rDEST',
          };

          const tx = service.buildModifyDepositAuthTransaction(wallet, env, config);

          expect(tx.Unauthorize).toBe('rDEST');
          expect(tx.TransactionType).toBe('DepositPreauth');
     });
});
