import { TestBed } from '@angular/core/testing';
import { VaultTransactionBuilderService } from './vault-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';
import * as xrpl from 'xrpl';

describe('VaultTransactionBuilderService', () => {
     let service: VaultTransactionBuilderService;

     beforeEach(() => {
          TestBed.configureTestingModule({
               providers: [VaultTransactionBuilderService, { provide: UtilsService, useValue: jasmine.createSpyObj('UtilsService', ['someMethod']) }, { provide: XrplTransactionService, useValue: jasmine.createSpyObj('XrplTransactionService', ['someMethod']) }, { provide: TrustlineUtilService, useValue: jasmine.createSpyObj('TrustlineUtilService', ['someMethod']) }, { provide: XrplCacheService, useValue: jasmine.createSpyObj('XrplCacheService', ['getVaultInfo']) }],
          });
          service = TestBed.inject(VaultTransactionBuilderService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     it('should use issued-currency assets for vault maximums', () => {
          const wallet = { address: 'rWallet' } as any;
          const env = { fee: '12', ledgerInfo: { lastIndex: 100 } } as any;
          const tx = service.buildCreateVaultTx(wallet, env, { amount: '10' }, { currency: 'USD', issuer: 'rIssuer' }, { tfVaultPrivate: false, tfVaultShareNonTransferable: false, vaultStrategyFirstComeFirstServe: false }, null);

          expect(tx.AssetsMaximum).toBe('10');
     });

     it('should use a plain numeric maximum for MPT vaults', () => {
          const wallet = { address: 'rWallet' } as any;
          const env = { fee: '12', ledgerInfo: { lastIndex: 100 } } as any;
          const tx = service.buildCreateVaultTx(wallet, env, { amount: '12345678' }, { currency: 'MPT', issuer: 'rIssuer' }, { tfVaultPrivate: false, tfVaultShareNonTransferable: false, vaultStrategyFirstComeFirstServe: false }, { mptIssuanceId: 'mpt-123' });

          expect(tx.AssetsMaximum).toBe('12345678');
     });
});
