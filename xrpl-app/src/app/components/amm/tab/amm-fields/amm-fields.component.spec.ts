import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AmmFieldsComponent } from './amm-fields.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { AmmUtilsService } from '../../../../services/amm/amm-utils/amm-utils.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { ConnectionGuardService } from '../../../../services/shared/connection-guard/connection-guard.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('AmmFieldsComponent', () => {
     let fixture: ComponentFixture<AmmFieldsComponent>;
     let component: AmmFieldsComponent;

     let storeMock: jasmine.SpyObj<any>;
     let vmMock: jasmine.SpyObj<any>;
     let utilsMock: jasmine.SpyObj<any>;
     let txUiMock: jasmine.SpyObj<any>;
     let ammUtilsMock: jasmine.SpyObj<any>;

     beforeEach(async () => {
          storeMock = jasmine.createSpyObj('AmmStoreService', ['setField'], {
               weWantAmount: () => '',
               weSpendAmount: () => '',
               assetPool1Balance: () => '0',
               assetPool2Balance: () => '0',
               tradingFeeField: () => '',
               lpTokenBalance: () => '0',
               withdrawlLpTokenFromPoolField: () => '',
               holderField: () => '',
          });

          vmMock = jasmine.createSpyObj('AmmTransactionViewModelService', [], {
               pool1CurrencyItems: () => [],
               pool2CurrencyItems: () => [],
               pool1IssuerItems: () => [],
               pool2IssuerItems: () => [],

               selectedPool1CurrencyItem: () => null,
               selectedPool2CurrencyItem: () => null,
               selectedPool1IssuerItem: () => null,
               selectedPool2IssuerItem: () => null,

               asset1UserBalance: () => '0',
               asset2UserBalance: () => '0',
               assetPool1Balance: () => '0',
               assetPool2Balance: () => '0',
          });

          utilsMock = jasmine.createSpyObj('UtilsService', ['encodeIfNeeded']);
          txUiMock = jasmine.createSpyObj('TransactionUiService', ['clearAllFields']);
          ammUtilsMock = jasmine.createSpyObj('AmmUtilsService', ['clearInputFields'], {
               depositOptions: () => ({
                    bothPools: true,
                    firstPoolOnly: false,
                    secondPoolOnly: false,
               }),
               withdrawOptions: () => ({
                    bothPools: true,
                    firstPoolOnly: false,
                    secondPoolOnly: false,
               }),
          });

          await TestBed.configureTestingModule({
               imports: [AmmFieldsComponent],
               providers: [
                    { provide: AmmStoreService, useValue: storeMock },
                    { provide: AmmTransactionViewModelService, useValue: vmMock },
                    { provide: AmmUtilsService, useValue: ammUtilsMock },
                    { provide: TransactionUiService, useValue: txUiMock },
                    { provide: UtilsService, useValue: utilsMock },
                    { provide: WalletManagerService, useValue: {} },
                    { provide: ConnectionGuardService, useValue: {} },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AmmFieldsComponent);
          component = fixture.componentInstance;

          // required inputs (Angular 17+ input API)
          fixture.componentRef.setInput('tab', 'createAMM');
          fixture.componentRef.setInput('destinationItems', []);
          fixture.componentRef.setInput('selectedDestinationItem', null);
          fixture.componentRef.setInput('destinationSearchQuery', '');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should emit currency selection for pool1', () => {
          spyOn(component.pool1CurrencySelected, 'emit');

          component.pool1CurrencySelected.emit({ id: 'XRP' } as any);

          expect(component.pool1CurrencySelected.emit).toHaveBeenCalledWith(
               jasmine.objectContaining({
                    id: 'XRP',
               })
          );
     });

     it('should emit issuer selection for pool2', () => {
          spyOn(component.pool2IssuerSelected, 'emit');

          component.pool2IssuerSelected.emit({ id: 'rTest' } as any);

          expect(component.pool2IssuerSelected.emit).toHaveBeenCalledWith(
               jasmine.objectContaining({
                    id: 'rTest',
               })
          );
     });

     it('should update destination search query', () => {
          spyOn(component.destinationSearchQueryChange, 'emit');

          component.destinationSearchQueryChange.emit('rABC');

          expect(component.destinationSearchQueryChange.emit).toHaveBeenCalledWith('rABC');
     });

     it('should emit deposit option change', () => {
          spyOn(component.depositOptionChange, 'emit');

          component.depositOptionChange.emit('bothPools');

          expect(component.depositOptionChange.emit).toHaveBeenCalledWith('bothPools');
     });

     it('should emit withdraw option change', () => {
          spyOn(component.withdrawOptionChange, 'emit');

          component.withdrawOptionChange.emit('firstPoolOnly');

          expect(component.withdrawOptionChange.emit).toHaveBeenCalledWith('firstPoolOnly');
     });
});
