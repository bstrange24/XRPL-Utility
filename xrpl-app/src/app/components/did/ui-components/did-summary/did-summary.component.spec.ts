import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { DidSummaryComponent } from './did-summary.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { NgIcon } from '@ng-icons/core';

/* ==================== MOCKS ==================== */

@Component({
     selector: 'app-tooltip-link',
     standalone: true,
     template: `<ng-content></ng-content>`,
})
class MockTooltipLinkComponent {
     @Input() href!: string;
     @Input() tooltipText!: string;
}

class MockCopyUtil {
     copyAndToast = jasmine.createSpy('copyAndToast');
}

class MockTxUi {
     explorerUrl = jasmine.createSpy('explorerUrl').and.returnValue('https://testnet.xrpl.org/');
}

class MockUtils {}

/* ==================== TEST SUITE ==================== */

describe('DidSummaryComponent', () => {
     let fixture: ComponentFixture<DidSummaryComponent>;
     let component: DidSummaryComponent;
     let copyUtil: MockCopyUtil;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [DidSummaryComponent],
               providers: [
                    { provide: CopyUtilService, useClass: MockCopyUtil },
                    { provide: TransactionUiService, useClass: MockTxUi },
                    { provide: UtilsService, useClass: MockUtils },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          })
               .overrideComponent(DidSummaryComponent, {
                    set: {
                         imports: [MockTooltipLinkComponent, NgIcon], // ← Fixed ng-icon error
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(DidSummaryComponent);
          component = fixture.componentInstance;
          copyUtil = TestBed.inject(CopyUtilService) as any;

          // Required inputs
          fixture.componentRef.setInput('infoPanelExpanded', true);
          fixture.componentRef.setInput('info', null);

          fixture.detectChanges();
     });

     function setInfo(data: any) {
          fixture.componentRef.setInput('info', data);
          fixture.detectChanges();
     }

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should show empty state when no DID', () => {
          setInfo({
               walletName: 'MyTestWallet',
               mode: 'setDid',
               didCount: 0,
               existingDid: [],
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('MyTestWallet');
          expect(text).toContain('has not created a DID yet');
          expect(text).toContain('This wallet has no DID yet');
     });

     it('should show "has a DID" message for setDid mode', () => {
          setInfo({
               walletName: 'MyTestWallet',
               mode: 'setDid',
               didCount: 1,
               existingDid: [{ index: 'DID123', URI: 'N/A', Data: 'N/A', DIDDocument: 'N/A' }],
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('has a DID set');
          expect(text).toContain('Only 1 DID can exist per account');
     });

     it('should show DID details when expanded and has DID', () => {
          const didData = {
               index: 'ABCDEF1234567890',
               URI: '{"some":"data"}',
               Data: '{"key":"value"}',
               DIDDocument: '{"id":"did:xrpl:..."}',
          };

          setInfo({
               walletName: 'MyTestWallet',
               mode: 'deleteDid',
               didCount: 1,
               existingDid: [didData],
          });

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Index:');
          expect(text).toContain('ABCDEF1234567890');
          expect(text).toContain('URI');
          expect(text).toContain('Data');
          expect(text).toContain('DID Document');
     });

     it('should call copyAndToast on button clicks', () => {
          const didData = {
               index: 'INDEX123',
               URI: 'URI_DATA',
               Data: 'DATA123',
               DIDDocument: 'DOCUMENT',
          };

          setInfo({
               walletName: 'Test',
               mode: 'setDid',
               didCount: 1,
               existingDid: [didData],
          });

          const buttons = fixture.debugElement.queryAll(By.css('button.btn-secondary'));

          expect(buttons.length).toBeGreaterThan(0);

          // Click "Copy Index"
          buttons[0].nativeElement.click();
          expect(copyUtil.copyAndToast).toHaveBeenCalledWith('INDEX123', 'Index');

          copyUtil.copyAndToast.calls.reset();

          // Click next available copy button (URI if exists)
          if (buttons.length > 1) {
               buttons[1].nativeElement.click();
               expect(copyUtil.copyAndToast).toHaveBeenCalledWith(jasmine.any(String), jasmine.any(String));
          }
     });

     it('should handle prettyJson formatting', () => {
          const result = component.prettyJson('{"a":1,"b":2}');
          expect(result).toContain('"a": 1');
          expect(result).toContain('"b": 2');
     });

     it('should return N/A for invalid or missing JSON', () => {
          expect(component.prettyJson(undefined)).toBe('N/A');
          expect(component.prettyJson('N/A')).toBe('N/A');
          expect(component.prettyJson('not json')).toBe('not json');
     });

     it('should react to info changes', () => {
          setInfo({ walletName: 'Wallet A', mode: 'setDid', didCount: 0, existingDid: [] });
          expect(fixture.nativeElement.textContent).toContain('Wallet A');

          setInfo({ walletName: 'Wallet B', mode: 'deleteDid', didCount: 1, existingDid: [{ index: 'X' }] });
          expect(fixture.nativeElement.textContent).toContain('Wallet B');
     });
});
