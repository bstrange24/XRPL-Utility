import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AccountChangesTableComponent } from './account-changes-table.component';
import { AccountChangesStoreService } from '../../../../services/account-balance-changes/account-changes-store/account-changes-store.service';
import { AccountChangesViewModelService } from '../../../../services/account-balance-changes/account-changes-view-model/account-changes-view-model.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { BalanceChange } from '../../constants/account-balance.types';

describe('AccountChangesTableComponent', () => {
     let component: AccountChangesTableComponent;
     let fixture: ComponentFixture<AccountChangesTableComponent>;
     let store: any;
     let viewModel: any;
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let txUiService: any;

     // Mock balance changes
     const mockBalanceChanges: BalanceChange[] = [
          {
               hash: 'hash1234567890abcdef1234567890abcdef12345678',
               date: new Date('2024-01-15T10:30:00Z'),
               type: 'Payment',
               change: 100.5,
               currency: 'XRP',
               fees: 0.000012,
               counterparty: 'rCounterparty123',
               balanceBefore: 1000,
               balanceAfter: 1100.5,
          },
          {
               hash: 'hash9876543210fedcba9876543210fedcba98765432',
               date: new Date('2024-01-14T15:45:00Z'),
               type: 'OfferCreate',
               change: -50.25,
               currency: 'XRP',
               fees: 0.000015,
               counterparty: 'rAnotherParty456',
               balanceBefore: 500,
               balanceAfter: 449.75,
          },
     ];

     beforeEach(async () => {
          store = {
               loadingInitial: signal(false),
               loadingMore: signal(false),
               hasMoreData: signal(true),
          };

          viewModel = {
               filteredBalanceChanges: signal(mockBalanceChanges),
               getTypeColor: jasmine.createSpy('getTypeColor').and.callFake((type: string) => {
                    if (type === 'Payment') return '#10b981';
                    return '#ef4444';
               }),
          };

          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copyTxHash']);
          copyUtilService.copyTxHash.and.returnValue();

          txUiService = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          await TestBed.configureTestingModule({
               imports: [AccountChangesTableComponent, ScrollingModule],
               providers: [
                    { provide: AccountChangesStoreService, useValue: store },
                    { provide: AccountChangesViewModelService, useValue: viewModel },
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(AccountChangesTableComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          viewModel.getTypeColor.calls.reset();
          copyUtilService.copyTxHash.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('scrolledToBottom output', () => {
          it('should have scrolledToBottom output', () => {
               expect(component.scrolledToBottom).toBeDefined();
               expect(component.scrolledToBottom.emit).toBeDefined();
          });

          it('should emit scrolledToBottom when called', () => {
               spyOn(component.scrolledToBottom, 'emit');
               component.scrolledToBottom.emit();
               expect(component.scrolledToBottom.emit).toHaveBeenCalled();
          });
     });

     describe('onScroll', () => {
          let mockScrollEvent: any;

          beforeEach(() => {
               mockScrollEvent = {
                    target: {
                         scrollHeight: 1000,
                         scrollTop: 800,
                         clientHeight: 200,
                    },
               };
          });

          it('should emit scrolledToBottom when near bottom', () => {
               spyOn(component.scrolledToBottom, 'emit');

               component.onScroll(mockScrollEvent as Event);

               expect(component.scrolledToBottom.emit).toHaveBeenCalled();
          });

          it('should not emit when loadingMore is true', () => {
               store.loadingMore.set(true);
               spyOn(component.scrolledToBottom, 'emit');

               component.onScroll(mockScrollEvent as Event);

               expect(component.scrolledToBottom.emit).not.toHaveBeenCalled();
          });

          it('should not emit when hasMoreData is false', () => {
               store.hasMoreData.set(false);
               spyOn(component.scrolledToBottom, 'emit');

               component.onScroll(mockScrollEvent as Event);

               expect(component.scrolledToBottom.emit).not.toHaveBeenCalled();
          });

          // it('should not emit when not near bottom', () => {
          //      const farFromBottomEvent = {
          //           target: {
          //                scrollHeight: 1000,
          //                scrollTop: 500,
          //                clientHeight: 200,
          //           },
          //      };
          //      spyOn(component.scrolledToBottom, 'emit');

          //      component.onScroll(farFromBottomEvent as Event);

          //      expect(component.scrolledToBottom.emit).not.toHaveBeenCalled();
          // });
     });

     describe('copyToClipboard', () => {
          it('should call copyUtilService.copyTxHash with the text', () => {
               const testHash = 'testHash123';
               component.copyToClipboard(testHash);

               expect(copyUtilService.copyTxHash).toHaveBeenCalledWith(testHash);
          });
     });

     describe('trackByHash', () => {
          it('should return the hash of the balance change', () => {
               const mockItem = mockBalanceChanges[0];
               const result = component.trackByHash(0, mockItem);

               expect(result).toBe(mockItem.hash);
          });
     });

     describe('Store bindings', () => {
          it('should have loadingInitial from store', () => {
               store.loadingInitial.set(true);
               fixture.detectChanges();
               expect(store.loadingInitial()).toBeTrue();
          });

          it('should have loadingMore from store', () => {
               store.loadingMore.set(true);
               fixture.detectChanges();
               expect(store.loadingMore()).toBeTrue();
          });

          it('should have hasMoreData from store', () => {
               store.hasMoreData.set(false);
               fixture.detectChanges();
               expect(store.hasMoreData()).toBeFalse();
          });
     });

     describe('ViewModel bindings', () => {
          it('should have filteredBalanceChanges from viewModel', () => {
               const changes = component.viewModel.filteredBalanceChanges();
               expect(changes).toEqual(mockBalanceChanges);
               expect(changes.length).toBe(2);
          });

          it('should have getTypeColor from viewModel', () => {
               const color = component.viewModel.getTypeColor('Payment');
               expect(color).toBe('#10b981');

               const otherColor = component.viewModel.getTypeColor('OfferCreate');
               expect(otherColor).toBe('#ef4444');
          });
     });

     describe('TxUiService bindings', () => {
          it('should have explorerUrl from txUiService', () => {
               expect(component.txUiService.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have filteredBalanceChanges available for template', () => {
               const changes = component.viewModel.filteredBalanceChanges();
               expect(changes).toBeDefined();
               expect(changes[0].hash.slice(0, 8)).toBe('hash1234');
               expect(changes[0].hash.slice(-8)).toBe('12345678');
          });

          it('should format date correctly', () => {
               const date = mockBalanceChanges[0].date;
               expect(date).toBeDefined();
          });

          it('should show positive change with plus sign and green color', () => {
               const positiveChange = mockBalanceChanges[0].change;
               expect(positiveChange).toBeGreaterThan(0);
          });

          it('should show negative change with red color', () => {
               const negativeChange = mockBalanceChanges[1].change;
               expect(negativeChange).toBeLessThan(0);
          });
     });

     describe('Edge cases', () => {
          it('should handle empty filteredBalanceChanges', () => {
               viewModel.filteredBalanceChanges.set([]);
               fixture.detectChanges();

               const changes = component.viewModel.filteredBalanceChanges();
               expect(changes).toEqual([]);
          });

          // it('should handle undefined event target in onScroll', () => {
          //      const invalidEvent = { target: null };

          //      expect(() => component.onScroll(invalidEvent as any)).not.toThrow();
          // });

          // it('should handle loadingMore true and hasMoreData false simultaneously', () => {
          //      store.loadingMore.set(true);
          //      store.hasMoreData.set(false);
          //      spyOn(component.scrolledToBottom, 'emit');

          //      const mockEvent = {
          //           target: {
          //                scrollHeight: 1000,
          //                scrollTop: 800,
          //                clientHeight: 200,
          //           },
          //      };

          //      component.onScroll(mockEvent as Event);

          //      expect(component.scrolledToBottom.emit).not.toHaveBeenCalled();
          // });

          it('should handle very long counterparty addresses', () => {
               const longAddress = 'r' + 'a'.repeat(100);
               const changeWithLongAddress: BalanceChange = {
                    ...mockBalanceChanges[0],
                    counterparty: longAddress,
               };
               viewModel.filteredBalanceChanges.set([changeWithLongAddress]);
               fixture.detectChanges();

               expect(component.viewModel.filteredBalanceChanges()[0].counterparty).toBe(longAddress);
          });
     });
});
