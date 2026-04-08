import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksCancelComponent } from './checks-cancel.component';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';

describe('ChecksCancelComponent', () => {
     let component: ChecksCancelComponent;
     let fixture: ComponentFixture<ChecksCancelComponent>;

     const vmMock = {
          activeTab: signal('cancelCheck'),
          checkItems: signal([]),
          filteredCheckIds: signal([]),
          selectedCheckItem: signal(null),
          checkIdDisplay: signal(''),
          checkIdInputDisplay: signal(''),
          checksStoreService: { checkIdSearchQuery: signal(''), checkIdField: signal(''), setField: jasmine.createSpy('setField') },
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [ChecksCancelComponent],
               providers: [
                    { provide: ChecksTransactionViewModelService, useValue: vmMock },
               ],
          })
               .overrideComponent(ChecksCancelComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksCancelComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should have checkItems EventEmitter', () => {
          expect(component.checkItems).toBeDefined();
     });

     it('should have checkSelected EventEmitter', () => {
          expect(component.checkSelected).toBeDefined();
     });

     it('should have selectedCheckItem EventEmitter', () => {
          expect(component.selectedCheckItem).toBeDefined();
     });
});
