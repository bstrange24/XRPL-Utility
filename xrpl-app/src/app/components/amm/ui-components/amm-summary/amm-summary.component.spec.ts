import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { AmmSummaryComponent } from './amm-summary.component';
import { AmmStoreService } from '../../../../services/amm/amm-store/amm-store.service';
import { AmmTransactionViewModelService } from '../../../../services/amm/amm-transaction-view-model/amm-transaction-view-model.service';
import { WalletManagerService } from '../../../../services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { XrplCacheService } from '../../../../services/xrpl-cache/xrpl-cache.service';
import { XrplService } from '../../../../services/xrpl-services/xrpl.service';

describe('AmmSummaryComponent', () => {
     let component: AmmSummaryComponent;
     let fixture: ComponentFixture<AmmSummaryComponent>;
     let selectedWallet: WritableSignal<{ name: string; address: string; classicAddress: string }>;
     let ammStore: ReturnType<typeof createAmmStore>;

     beforeEach(async () => {
          selectedWallet = signal({ name: 'Wallet 1', address: 'rWallet1', classicAddress: 'rWallet1' });
          ammStore = createAmmStore();

          await TestBed.configureTestingModule({
               imports: [AmmSummaryComponent],
               providers: [
                    { provide: AmmStoreService, useValue: ammStore },
                    { provide: AmmTransactionViewModelService, useValue: { activeTab: signal('createAMM') } },
                    { provide: WalletManagerService, useValue: { getSelectedWallet: () => selectedWallet() } },
                    { provide: TransactionUiService, useValue: {} },
                    { provide: CopyUtilService, useValue: {} },
                    { provide: XrplCacheService, useValue: {} },
                    { provide: XrplService, useValue: {} },
               ],
          })
               .overrideComponent(AmmSummaryComponent, { set: { template: '' } })
               .compileComponents();

          fixture = TestBed.createComponent(AmmSummaryComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          await fixture.whenStable();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('does not count shared pool reserves as wallet participation', () => {
          expect(component.infoData()?.poolCount).toBe(0);
          expect(component.getSummaryText(component.infoData())).toContain('no LP position');
          expect(component.getEmptyStateMessage()).toContain('No LP position');
          expect(component.getEmptyStateSubMessage()).toContain('not swap or clawback history');
     });

     it('only shows LP holdings for the wallet that was queried', async () => {
          ammStore.lpTokenBalance.set('10');
          ammStore.ammInfoWalletAddress.set('rWallet1');
          fixture.detectChanges();
          await fixture.whenStable();
          expect(component.infoData()?.poolCount).toBe(1);

          selectedWallet.set({ name: 'Wallet 2', address: 'rWallet2', classicAddress: 'rWallet2' });
          fixture.detectChanges();
          await fixture.whenStable();
          expect(component.infoData()?.poolCount).toBe(0);

          ammStore.lpTokenBalance.set('0');
          ammStore.ammInfoWalletAddress.set('rWallet2');
          fixture.detectChanges();
          await fixture.whenStable();
          expect(component.infoData()?.poolCount).toBe(0);
     });

     it('shows a pool when the selected wallet has LP tokens', async () => {
          ammStore.lpTokenBalance.set('5');
          ammStore.ammInfoWalletAddress.set('rWallet1');
          fixture.detectChanges();
          await fixture.whenStable();

          expect(component.infoData()?.poolCount).toBe(1);
          expect(component.infoData()?.myPoolCount).toBe(1);
     });
});

function createAmmStore() {
     return {
          isLiquidityProvider: signal(false),
          lpTokenBalance: signal('0'),
          ammInfoWalletAddress: signal('rWallet1'),
          ammAccount: signal('rAMM'),
          weWantCurrency: signal('USD'),
          weSpendCurrency: signal('XRP'),
          assetPool1Balance: signal('100'),
          assetPool2Balance: signal('200'),
          lpTokenTotal: signal('20'),
          tradingFeeField: signal('0.1'),
     };
}
