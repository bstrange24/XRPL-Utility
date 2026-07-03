import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { VaultViewModelService } from './vault-view-model.service';
import { WalletManagerService } from '../../wallets/manager/wallet-manager.service';
import { VaultStoreService } from '../vault-store/vault-store.service';
import { MptStoreService } from '../../mpt/mpt-store/mpt-store.service';
import { TransactionDropdownService } from '../../transaction-dropdown/transaction-dropdown.service';
import { TxEnvironmentService } from '../../transaction-environment/tx-environment.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { TrustlineCurrencyService } from '../../trustlines/trustline-currency/trustline-currency.service';
import { CurrencyStoreService } from '../../currency/currency-store/currency-store.service';
import { ChecksStoreService } from '../../checks/checks-store/checks-store.service';
import { CheckUtilService } from '../../checks/checks-util/check-util.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { AcccountDataService } from '../../account-data/acccount-data.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { CopyUtilService } from '../../utils/copy-util/copy-util.service';
import { DownloadUtilService } from '../../utils/download-util/download-util.service';
import { ToastService } from '../../utils/toast/toast.service';
import { TrustlineStoreService } from '../../trustlines/trustline-store/trustline-store.service';
import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import { VaultCacheService } from '../vault-cache/vault-cache.service';
import { XrplCacheService } from '../../xrpl-cache/xrpl-cache.service';

describe('VaultViewModelService', () => {
     let service: VaultViewModelService;

     beforeEach(() => {
          const walletManagerService = jasmine.createSpyObj('WalletManagerService', ['getSelectedWallet'], {
               wallets: jasmine.createSpy().and.returnValue([{ address: 'rDepositor', name: 'Depositor' }]),
               getSelectedWallet: jasmine.createSpy().and.returnValue({ address: 'rDepositor' }),
          });

          const vaultStoreService = jasmine.createSpyObj('VaultStoreService', ['existingVaults'], {
               existingVaults: jasmine.createSpy().and.returnValue([{ shareMPTID: 'share-123', owner: 'rOwner', sender: 'rOwner', index: 'vault-1', id: 'vault-1' }]),
          });

          const mptStoreService = jasmine.createSpyObj('MptStoreService', ['existingMpts'], {
               existingMpts: jasmine.createSpy().and.returnValue([
                    { mpt_issuance_id: 'share-123', balance: '5', MPTAmount: '5' },
                    { mpt_issuance_id: 'other-mpt', balance: '10', MPTAmount: '10' },
               ]),
          });

          const transactionDropdownService = jasmine.createSpyObj('TransactionDropdownService', ['allDestinations', 'destinationMap', 'destinationItems', 'selectedDestinationItem'], {
               customDestinations: [],
               allDestinations: jasmine.createSpy().and.returnValue([]),
               destinationMap: jasmine.createSpy().and.returnValue(new Map()),
               destinationItems: jasmine.createSpy().and.returnValue([]),
               selectedDestinationItem: jasmine.createSpy().and.returnValue(null),
          });

          TestBed.configureTestingModule({
               providers: [
                    VaultViewModelService,
                    { provide: WalletManagerService, useValue: walletManagerService },
                    { provide: VaultStoreService, useValue: vaultStoreService },
                    { provide: MptStoreService, useValue: mptStoreService },
                    { provide: TxEnvironmentService, useValue: {} },
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://explorer/'), warningMessage: '' } },
                    { provide: TrustlineCurrencyService, useValue: { currencyItems: signal([]), issuerItems: signal([]) } },
                    { provide: CurrencyStoreService, useValue: { balance: () => signal(''), issuer: () => signal(''), currency: () => signal('') } },
                    { provide: ChecksStoreService, useValue: {} },
                    { provide: CheckUtilService, useValue: {} },
                    { provide: UtilsService, useValue: {} },
                    { provide: TransactionDropdownService, useValue: transactionDropdownService },
                    { provide: AcccountDataService, useValue: {} },
                    { provide: XrplTransactionService, useValue: {} },
                    { provide: CopyUtilService, useValue: {} },
                    { provide: DownloadUtilService, useValue: {} },
                    { provide: ToastService, useValue: {} },
                    { provide: TrustlineStoreService, useValue: {} },
                    { provide: EscrowStoreService, useValue: {} },
                    { provide: VaultCacheService, useValue: {} },
                    { provide: XrplCacheService, useValue: {} },
               ],
          });

          service = TestBed.inject(VaultViewModelService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     it('should only surface MPT balances that belong to known vault share issuances', () => {
          service.activeTab.set('depositVault' as any);

          const info = service.infoData();

          expect(info?.vaultsToShow.some(vault => vault.shareMPTID === 'share-123')).toBeTrue();
          expect(info?.vaultsToShow.some(vault => vault.shareMPTID === 'other-mpt')).toBeFalse();
     });
});
