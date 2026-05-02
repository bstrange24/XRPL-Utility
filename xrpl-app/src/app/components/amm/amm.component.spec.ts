import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CreateAmmComponent } from './amm.component';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

/* -----------------------------
   Safe ActivatedRoute mock
------------------------------*/
class MockParamMap {
     constructor(private params: Record<string, string> = {}) {}

     get(key: string): string | null {
          return this.params[key] ?? null;
     }

     has(key: string): boolean {
          return key in this.params;
     }
}

class MockActivatedRoute {
     snapshot = {
          queryParamMap: new MockParamMap({}),
     } as any;
}

/* -----------------------------
   Wallet mock
------------------------------*/
class MockWalletManagerService {
     wallets = signal([]);

     getSelectedWallet = jasmine.createSpy().and.returnValue({
          address: 'rTEST',
          classicAddress: 'rTEST',
     });

     ensureWalletSelected = jasmine.createSpy().and.returnValue(true);
}

/* -----------------------------
   UI + UX services
------------------------------*/
class MockTransactionUiService {
     clearAllOptionsAndMessages = jasmine.createSpy();
     resetCurrentStepToIdle = jasmine.createSpy();
     clearAllFields = jasmine.createSpy();
}

class MockTransactionDropdownService {
     setupAutoSelectOnValidTypedAddress = jasmine.createSpy();
     loadCustomDestinations = jasmine.createSpy();

     getFinalDestinationAddress = jasmine.createSpy().and.returnValue('rDEST');
}

class MockWalletDataService {}
class MockCopyUtilService {}
class MockDownloadUtilService {}

class MockToastService {
     error = jasmine.createSpy();
}

class MockAcccountDataService {
     refreshUiState = jasmine.createSpy();
}

class MockStorageService {}

class MockTxEnvironmentService {
     prepareTxEnvironmentWithWallet = jasmine.createSpy().and.resolveTo({
          client: {},
          wallet: { classicAddress: 'rTEST' },
          accountInfo: {},
          accountObjects: {},
     });
}

/* -----------------------------
   AMM services
------------------------------*/
class MockAmmStoreService {
     getAll = jasmine.createSpy().and.returnValue({});
     setField = jasmine.createSpy();

     weWantCurrency = jasmine.createSpy().and.returnValue('XRP');
     weSpendCurrency = jasmine.createSpy().and.returnValue('USD');
     weWantIssuer = jasmine.createSpy().and.returnValue('');
     weSpendIssuer = jasmine.createSpy().and.returnValue('');
}

class MockAmmTransactionViewModelService {
     activeTab = signal('swapViaAMM');

     pool1Currency = signal('');
     pool1Issuer = signal('');
     pool1IssuersTrigger = signal(0);

     pool2Currency = signal('');
     pool2Issuer = signal('');
     pool2IssuersTrigger = signal(0);
}

class MockAmmTransactionOrchestratorService {
     executeAmmTx = jasmine.createSpy().and.resolveTo({
          success: true,
          hash: 'tx123',
     });
}

class MockAmmTransactionBuilderService {
     toXRPLCurrency = jasmine.createSpy().and.returnValue({});
}

class MockAmmUtilsService {
     clearInputFields = jasmine.createSpy();
     depositOptions = jasmine.createSpy().and.returnValue([]);
     withdrawOptions = jasmine.createSpy().and.returnValue([]);
}

/* -----------------------------
   Other dependencies
------------------------------*/
class MockTrustlineCurrencyService {
     load = jasmine.createSpy();
     refreshCurrentBalance = jasmine.createSpy();

     preferXrpAsDefault = signal(false);
     addXrpInCurrencyDropdown = signal(false);

     selectWeWantCurrency = jasmine.createSpy();
     selectWeWantIssuer = jasmine.createSpy();
     selectWeSpendCurrency = jasmine.createSpy();
     selectWeSpendIssuer = jasmine.createSpy();

     refreshBothBalances = jasmine.createSpy().and.resolveTo(true);
}

class MockTrustlineStoreService {}
class MockTrustlineUtilService {}
class MockOfferCurrencyService {
     weWant = {
          currency: signal('XRP'),
          issuer: signal(''),
          issuers: signal([]),
     };

     weSpend = {
          currency: signal('XRP'),
          issuer: signal(''),
          issuers: signal([]),
     };

     setWalletAddress = jasmine.createSpy();
     refreshBothBalances = jasmine.createSpy().and.resolveTo(true);

     selectWeWantCurrency = jasmine.createSpy();
     selectWeWantIssuer = jasmine.createSpy();
     selectWeSpendCurrency = jasmine.createSpy();
     selectWeSpendIssuer = jasmine.createSpy();
}

class MockRightPanelService {
     setPanel = jasmine.createSpy();
}

class MockConnectionGuardService {}

describe('CreateAmmComponent', () => {
     let component: CreateAmmComponent;
     let fixture: ComponentFixture<CreateAmmComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [CreateAmmComponent],
               providers: [{ provide: ActivatedRoute, useClass: MockActivatedRoute }],
          })
               .overrideComponent(CreateAmmComponent, {
                    set: {
                         providers: [
                              { provide: MockWalletManagerService, useClass: MockWalletManagerService },
                              { provide: MockTransactionUiService, useClass: MockTransactionUiService },
                              { provide: MockTransactionDropdownService, useClass: MockTransactionDropdownService },
                              { provide: MockTxEnvironmentService, useClass: MockTxEnvironmentService },
                              { provide: MockToastService, useClass: MockToastService },
                              { provide: MockAcccountDataService, useClass: MockAcccountDataService },
                              { provide: MockStorageService, useClass: MockStorageService },

                              { provide: MockAmmStoreService, useClass: MockAmmStoreService },
                              { provide: MockAmmTransactionViewModelService, useClass: MockAmmTransactionViewModelService },
                              { provide: MockAmmTransactionOrchestratorService, useClass: MockAmmTransactionOrchestratorService },
                              { provide: MockAmmTransactionBuilderService, useClass: MockAmmTransactionBuilderService },
                              { provide: MockAmmUtilsService, useClass: MockAmmUtilsService },

                              { provide: MockTrustlineCurrencyService, useClass: MockTrustlineCurrencyService },
                              { provide: MockOfferCurrencyService, useClass: MockOfferCurrencyService },
                              { provide: MockRightPanelService, useClass: MockRightPanelService },
                              { provide: MockConnectionGuardService, useClass: MockConnectionGuardService },
                              { provide: MockDownloadUtilService, useClass: MockDownloadUtilService },
                              { provide: MockCopyUtilService, useClass: MockCopyUtilService },
                              { provide: MockTrustlineStoreService, useClass: MockTrustlineStoreService },
                              { provide: MockTrustlineUtilService, useClass: MockTrustlineUtilService },
                              { provide: MockWalletDataService, useClass: MockWalletDataService },
                              { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
                         ],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(CreateAmmComponent);
          component = fixture.componentInstance;

          fixture.detectChanges(); // triggers constructor + effects
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should update destination search query', () => {
          component.handleSearchQueryChange('abc');
          expect(component.destinationSearchQuery()).toBe('abc');
     });

     it('should update destination selection', () => {
          component.handleDestinationChange({ id: 'r123' } as any);
          expect(component.selectedDestinationAddress()).toBe('r123');
     });

     it('should call performAction without crashing', async () => {
          await expectAsync(component.performAction()).toBeResolved();
     });

     it('should switch pool currency handlers', () => {
          component.onPool1CurrencySelected({ id: 'XRP' } as any);
          component.onPool2CurrencySelected({ id: 'USD' } as any);

          expect().nothing(); // just ensures no crash
     });
});
