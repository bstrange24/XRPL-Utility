import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChecksSummaryComponent } from './checks-summary.component';
import { CheckUtilService } from '../../../../services/checks/checks-util/check-util.service';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { ChecksTransactionViewModelService } from '../../../../services/checks/checks-transaction-view-model/checks-transaction-view-model.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';

describe('ChecksSummaryComponent', () => {
     let component: ChecksSummaryComponent;
     let fixture: ComponentFixture<ChecksSummaryComponent>;

     const checkUtilMock = {
          onCheckSelected: jasmine.createSpy('onCheckSelected'),
          isCheckExpired: () => false,
     };

     const vmMock = {
          checksToShow: signal([]),
          activeTab: signal('createCheck'),
          checkCount: signal(0),
     };

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [ChecksSummaryComponent],
               providers: [
                    { provide: CheckUtilService, useValue: checkUtilMock },
                    { provide: CopyUtilService, useValue: { copy: jasmine.createSpy() } },
                    { provide: TransactionUiService, useValue: { explorerUrl: signal('https://testnet.xrpl.org/'), currentStep: signal('idle') } },
                    { provide: ChecksTransactionViewModelService, useValue: vmMock },
                    { provide: UtilsService, useValue: {} },
               ],
          })
               .overrideComponent(ChecksSummaryComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(ChecksSummaryComponent);
          component = fixture.componentInstance;
          fixture.componentRef.setInput('wallet', { address: 'rTEST' });
          fixture.componentRef.setInput('checksLength', 0);
          fixture.componentRef.setInput('tab', 'createCheck');
          fixture.componentRef.setInput('infoPanelExpanded', false);
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     it('should emit checkSelected when onCheckClick is called', () => {
          const emittedValues: any[] = [];
          component.checkSelected.subscribe((val: any) => emittedValues.push(val));
          const mockCheck = { id: 'CHK1', amount: '10 XRP' };
          component.onCheckClick(mockCheck);
          expect(emittedValues.length).toBe(1);
          expect(emittedValues[0]).toEqual(mockCheck);
     });

     it('should call checkUtilService.onCheckSelected when selectCheck is called', () => {
          const mockCheck = { id: 'CHK2' };
          component.selectCheck(mockCheck, 'list');
          expect(checkUtilMock.onCheckSelected).toHaveBeenCalledWith(mockCheck);
     });

     it('should have toggleInfoPanel output', () => {
          expect(component.toggleInfoPanel).toBeDefined();
     });
});
