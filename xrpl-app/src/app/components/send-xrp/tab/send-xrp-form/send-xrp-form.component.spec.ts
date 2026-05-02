import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendXrpFormComponent } from './send-xrp-form.component';
import { signal } from '@angular/core';

/** -------------------------
 * STUB COMPONENTS
 * ------------------------*/
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

@Component({
     selector: 'app-select-search-dropdown',
     standalone: true,
     template: '',
})
class SelectSearchDropdownStub {
     @Input() items: any;
     @Input() value: any;
     @Input() searchQueryInput: any;

     @Output() searchQueryChange = new EventEmitter<string>();
     @Output() valueChange = new EventEmitter<any>();
}

@Component({
     selector: 'app-transaction-options-section',
     standalone: true,
     template: '',
})
class TransactionOptionsSectionStub {
     @Input() activeTab: any;
}

/** -------------------------
 * MOCK XRPL STORE (IMPORTANT FIX)
 * ------------------------*/
const xrplTxOptionsStoreMock = {
     isMemoEnabled: signal(false),
     useMultiSign: signal(false),
     isRegularKeyAddress: signal(false),
     isTicket: signal(false),
     isSimulateEnabled: signal(false),

     destinationTag: signal(null),
     sourceTag: signal(''),
     invoiceId: signal(''),
};

/** -------------------------
 * MOCK SERVICES
 * ------------------------*/
const txUiServiceMock = {
     wantsOptions: signal(false),
};

const accountConfiguratorStoreMock = {
     amount: signal(10),
};

const utilsServiceMock = {
     updateAmount: jasmine.createSpy('updateAmount'),
};

describe('SendXrpFormComponent', () => {
     let fixture: ComponentFixture<SendXrpFormComponent>;
     let component: SendXrpFormComponent;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [SendXrpFormComponent, SelectSearchDropdownStub, TransactionOptionsSectionStub],
               providers: [
                    { provide: 'TransactionUiService', useValue: txUiServiceMock },
                    { provide: 'AccountConfiguratorStoreService', useValue: accountConfiguratorStoreMock },
                    { provide: 'UtilsService', useValue: utilsServiceMock },
                    { provide: 'XrplTxOptionsStore', useValue: xrplTxOptionsStoreMock },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(SendXrpFormComponent);
          component = fixture.componentInstance;

          // REQUIRED INPUTS (avoid template crashes)
          fixture.componentRef.setInput('destinationItems', []);
          fixture.componentRef.setInput('selectedDestinationItem', null);
          fixture.componentRef.setInput('destinationSearchQuery', '');
          fixture.componentRef.setInput('wantsOptions', false);
          fixture.componentRef.setInput('view', {});
          fixture.componentRef.setInput('info', '');
          fixture.componentRef.setInput('tab', 'sendXrp');

          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     // it('should NOT render optional section by default', () => {
     //      const text = fixture.nativeElement.textContent;
     //      expect(text).not.toContain('Include optional fields');
     // });

     it('should render optional section when enabled', () => {
          fixture.componentRef.setInput('wantsOptions', true);
          fixture.detectChanges();

          const text = fixture.nativeElement.textContent;
          expect(text).toContain('Include optional fields');
     });

     it('should emit toggleOptions when checkbox changes', () => {
          spyOn(component.toggleOptions, 'emit');

          fixture.componentRef.setInput('wantsOptions', true);
          fixture.detectChanges();

          const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change'));

          expect(component.toggleOptions.emit).toHaveBeenCalled();
     });
});
