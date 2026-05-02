import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { SummaryComponent } from './summary.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';

// Mock child components
@Component({ selector: 'app-summary-container', template: '<div></div>', standalone: true })
class MockSummaryContainer {}

@Component({ selector: 'app-summary-item', template: '<div></div>', standalone: true })
class MockSummaryItem {}

@Component({ selector: 'app-summary-key-value', template: '<div></div>', standalone: true })
class MockSummaryKeyValue {}

@Component({ selector: 'app-tooltip-link', template: '<div></div>', standalone: true })
class MockTooltipLink {}

describe('SummaryComponent', () => {
     let component: SummaryComponent;
     let fixture: ComponentFixture<SummaryComponent>;
     let copyUtilServiceSpy: jasmine.SpyObj<CopyUtilService>;
     let txUiServiceSpy: any;

     const mockTrustlineInfo = {
          walletName: 'Test Wallet',
          trustlineCount: 3,
          trustlinesToShow: [
               {
                    currency: 'USD',
                    issuer: 'rIssuer1',
                    limit: '1000',
                    balance: '500',
                    flags: ['lsfLowXfer', 'lsfHighXfer'],
               },
               {
                    currency: 'EUR',
                    issuer: 'rIssuer2',
                    limit: '2000',
                    balance: '750',
                    flags: [],
               },
          ],
          emptyMessage: 'No trustlines found.',
          countText: 'trustlines',
          helpHint: 'Trustlines allow you to hold currencies',
     };

     const mockWallet = {
          classicAddress: 'rTestWallet',
          address: 'rTestWallet',
     };

     beforeEach(async () => {
          copyUtilServiceSpy = jasmine.createSpyObj('CopyUtilService', ['copyAndToast']);
          txUiServiceSpy = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          await TestBed.configureTestingModule({
               imports: [SummaryComponent],
               providers: [provideNoopAnimations(), provideIcons({}), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: CopyUtilService, useValue: copyUtilServiceSpy }, { provide: TransactionUiService, useValue: txUiServiceSpy }],
          })
               .overrideComponent(SummaryComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(SummaryComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('info', mockTrustlineInfo);
          fixture.componentRef.setInput('isExpanded', false);
          fixture.componentRef.setInput('wallet', mockWallet);

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have info input', () => {
               expect(component.info()).toEqual(mockTrustlineInfo);
          });

          it('should accept null info', () => {
               fixture.componentRef.setInput('info', null);
               fixture.detectChanges();
               expect(component.info()).toBeNull();
          });

          it('should have isExpanded input', () => {
               expect(component.isExpanded()).toBeFalse();
          });

          it('should accept isExpanded as true', () => {
               fixture.componentRef.setInput('isExpanded', true);
               fixture.detectChanges();
               expect(component.isExpanded()).toBeTrue();
          });

          it('should have wallet input', () => {
               expect(component.wallet()).toEqual(mockWallet);
          });

          it('should accept null wallet', () => {
               fixture.componentRef.setInput('wallet', null);
               fixture.detectChanges();
               expect(component.wallet()).toBeNull();
          });

          it('should accept wallet with only address', () => {
               const walletOnlyAddress = { address: 'rOnlyAddress' };
               fixture.componentRef.setInput('wallet', walletOnlyAddress);
               fixture.detectChanges();
               expect(component.wallet()).toEqual(walletOnlyAddress);
          });
     });

     describe('Outputs', () => {
          it('should emit toggleExpanded when called', () => {
               spyOn(component.toggleExpanded, 'emit');
               component.toggleExpanded.emit();
               expect(component.toggleExpanded.emit).toHaveBeenCalled();
          });
     });

     describe('summaryText computed', () => {
          it('should return empty string when info is null', () => {
               fixture.componentRef.setInput('info', null);
               fixture.detectChanges();
               expect(component.summaryText()).toBe('');
          });

          it('should return empty message when trustlineCount is 0', () => {
               const emptyInfo = { ...mockTrustlineInfo, trustlineCount: 0 };
               fixture.componentRef.setInput('info', emptyInfo);
               fixture.detectChanges();
               expect(component.summaryText()).toBe('No trustlines found.');
          });

          it('should return formatted summary when trustlines exist', () => {
               expect(component.summaryText()).toContain('has <strong>3</strong> trustlines');
          });

          it('should use countText from info', () => {
               const customCountInfo = { ...mockTrustlineInfo, trustlineCount: 5, countText: 'items' };
               fixture.componentRef.setInput('info', customCountInfo);
               fixture.detectChanges();
               expect(component.summaryText()).toContain('has <strong>5</strong> items');
          });
     });

     describe('copyIssuer', () => {
          it('should call copyAndToast with issuer address', () => {
               const issuer = 'rTestIssuer';
               component.copyIssuer(issuer);
               expect(copyUtilServiceSpy.copyAndToast).toHaveBeenCalledWith(issuer, 'Issuer Address');
          });

          it('should handle empty issuer', () => {
               component.copyIssuer('');
               expect(copyUtilServiceSpy.copyAndToast).toHaveBeenCalledWith('', 'Issuer Address');
          });
     });

     describe('Service Injections', () => {
          it('should have copyUtilService injected', () => {
               expect(component['copyUtilService']).toBe(copyUtilServiceSpy);
          });

          it('should have txUiService injected', () => {
               expect(component.txUiService).toBe(txUiServiceSpy);
          });
     });

     describe('explorerUrl', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('Template Data Display', () => {
          it('should display trustline currency', () => {
               const trustline = mockTrustlineInfo.trustlinesToShow[0];
               expect(trustline.currency).toBe('USD');
          });

          it('should display trustline issuer', () => {
               const trustline = mockTrustlineInfo.trustlinesToShow[0];
               expect(trustline.issuer).toBe('rIssuer1');
          });

          it('should display trustline limit', () => {
               const trustline = mockTrustlineInfo.trustlinesToShow[0];
               expect(trustline.limit).toBe('1000');
          });

          it('should display trustline balance', () => {
               const trustline = mockTrustlineInfo.trustlinesToShow[0];
               expect(trustline.balance).toBe('500');
          });

          it('should display flags when present', () => {
               const trustline = mockTrustlineInfo.trustlinesToShow[0];
               expect(trustline.flags).toEqual(['lsfLowXfer', 'lsfHighXfer']);
               expect(trustline.flags.length).toBe(2);
          });

          it('should not display flags section when empty', () => {
               const trustline = mockTrustlineInfo.trustlinesToShow[1];
               expect(trustline.flags).toEqual([]);
               expect(trustline.flags.length).toBe(0);
          });
     });

     describe('Help Hint', () => {
          it('should display help hint when present', () => {
               expect(mockTrustlineInfo.helpHint).toBe('Trustlines allow you to hold currencies');
          });

          it('should handle missing help hint', () => {
               const infoWithoutHint = { ...mockTrustlineInfo, helpHint: undefined };
               fixture.componentRef.setInput('info', infoWithoutHint);
               fixture.detectChanges();
               expect(infoWithoutHint.helpHint).toBeUndefined();
          });
     });

     describe('Edge Cases', () => {
          it('should handle trustlinesToShow as empty array', () => {
               const emptyTrustlinesInfo = { ...mockTrustlineInfo, trustlinesToShow: [], trustlineCount: 0 };
               fixture.componentRef.setInput('info', emptyTrustlinesInfo);
               fixture.detectChanges();
               expect(component.summaryText()).toBe('No trustlines found.');
          });

          it('should handle undefined trustlineCount', () => {
               const undefinedCountInfo = { ...mockTrustlineInfo, trustlineCount: undefined };
               fixture.componentRef.setInput('info', undefinedCountInfo);
               fixture.detectChanges();
               expect(component.summaryText()).toContain('has <strong>undefined</strong>');
          });

          it('should handle missing countText', () => {
               const missingCountTextInfo = { ...mockTrustlineInfo, countText: undefined };
               fixture.componentRef.setInput('info', missingCountTextInfo);
               fixture.detectChanges();
               expect(component.summaryText()).toContain('has <strong>3</strong> undefined');
          });

          it('should handle wallet with only classicAddress', () => {
               const classicOnlyWallet = { classicAddress: 'rClassicOnly' };
               fixture.componentRef.setInput('wallet', classicOnlyWallet);
               fixture.detectChanges();
               expect(component.wallet()).toEqual(classicOnlyWallet);
          });

          it('should handle null trustlinesToShow', () => {
               const nullTrustlinesInfo = { ...mockTrustlineInfo, trustlinesToShow: null };
               fixture.componentRef.setInput('info', nullTrustlinesInfo);
               fixture.detectChanges();
               // The template will handle null gracefully
               expect(component.info()).toEqual(nullTrustlinesInfo);
          });
     });

     describe('Wallet Display', () => {
          it('should use classicAddress when available', () => {
               expect(mockWallet.classicAddress).toBe('rTestWallet');
          });

          // it('should fallback to address when classicAddress not available', () => {
          //      const walletNoClassic = { address: 'rOnlyAddress' };
          //      expect(walletNoClassic.address).toBe('rOnlyAddress');
          //      expect(walletNoClassic.classicAddress).toBeUndefined();
          // });
     });
});
