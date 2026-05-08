import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CredentialsSummaryComponent } from './credentials-summary.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { CredentialUtilService } from '../../../../services/credentials/credential-util/credential-util.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { SummaryTextConfigService } from '../../../../services/shared/summary-text-config/summary-text-config.service';
import { CredentialActionTypes, CredentialItemVm } from '../../constants/credential.types';

describe('CredentialsSummaryComponent', () => {
     let component: CredentialsSummaryComponent;
     let fixture: ComponentFixture<CredentialsSummaryComponent>;

     // Services
     let copyUtilService: jasmine.SpyObj<CopyUtilService>;
     let txUiService: any;
     let credentialUtilService: jasmine.SpyObj<CredentialUtilService>;
     let summaryTextConfigService: jasmine.SpyObj<SummaryTextConfigService>;

     // Mock data
     const mockWallet = { address: 'rTestAddress123' };
     const mockView = { walletName: 'Test Wallet', summaryMessage: 'Test summary' };
     const mockCreds = {
          list: [
               { id: 'cred1', Issuer: 'rTestAddress123', Subject: 'rSubject1', display: 'Credential 1' },
               { id: 'cred2', Issuer: 'rOtherAddress', Subject: 'rSubject2', display: 'Credential 2' },
          ] as unknown as CredentialItemVm[],
     };
     const mockCredsLength = 2;

     beforeEach(async () => {
          copyUtilService = jasmine.createSpyObj('CopyUtilService', ['copy']);
          txUiService = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };
          credentialUtilService = jasmine.createSpyObj('CredentialUtilService', ['selectCredentialFromList']);
          summaryTextConfigService = jasmine.createSpyObj('SummaryTextConfigService', ['buildSummaryText']);

          summaryTextConfigService.buildSummaryText.and.returnValue('Test summary text');

          await TestBed.configureTestingModule({
               imports: [CredentialsSummaryComponent],
               providers: [
                    { provide: CopyUtilService, useValue: copyUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: CredentialUtilService, useValue: credentialUtilService },
                    { provide: SummaryTextConfigService, useValue: summaryTextConfigService },
               ],
          })
               .overrideComponent(CredentialsSummaryComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(CredentialsSummaryComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('wallet', mockWallet);
          fixture.componentRef.setInput('view', mockView);
          fixture.componentRef.setInput('creds', mockCreds);
          fixture.componentRef.setInput('credsLength', mockCredsLength);
          fixture.componentRef.setInput('tab', 'acceptCredential');
          fixture.componentRef.setInput('infoPanelExpanded', false);

          fixture.detectChanges();
     });

     afterEach(() => {
          summaryTextConfigService.buildSummaryText.calls.reset();
          credentialUtilService.selectCredentialFromList.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input signals', () => {
          it('should accept wallet input', () => {
               expect(component.wallet()).toEqual(mockWallet);
          });

          it('should accept view input', () => {
               expect(component.view()).toEqual(mockView);
          });

          it('should accept creds input', () => {
               expect(component.creds()).toEqual(mockCreds);
          });

          it('should accept credsLength input', () => {
               expect(component.credsLength()).toBe(2);
          });

          it('should accept tab input', () => {
               expect(component.tab()).toBe('acceptCredential');
          });

          // it('should accept infoPanelExpanded input', () => {
          //      expect(component.infoPanelExpanded()).toBeFalse();
          // });

          it('should update wallet input when changed', () => {
               const newWallet = { address: 'rNewWallet' };
               fixture.componentRef.setInput('wallet', newWallet);
               fixture.detectChanges();
               expect(component.wallet()).toEqual(newWallet);
          });

          it('should update credsLength when changed', () => {
               fixture.componentRef.setInput('credsLength', 5);
               fixture.detectChanges();
               expect(component.credsLength()).toBe(5);
          });
     });

     describe('Output signals', () => {
          it('should have toggleInfoPanel output', () => {
               expect(component.toggleInfoPanel).toBeDefined();
               expect(component.toggleInfoPanel.emit).toBeDefined();
          });

          it('should have credentialSelected output', () => {
               expect(component.credentialSelected).toBeDefined();
               expect(component.credentialSelected.emit).toBeDefined();
          });

          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               component.toggleInfoPanel.emit();
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });

          it('should emit credentialSelected when called', () => {
               spyOn(component.credentialSelected, 'emit');
               const mockCred = mockCreds.list[0];
               component.credentialSelected.emit(mockCred);
               expect(component.credentialSelected.emit).toHaveBeenCalledWith(mockCred);
          });
     });

     describe('explorerUrl', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('summaryText', () => {
          it('should build summary text using view wallet name and credsLength', () => {
               const result = component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 2, 'acceptCredential', jasmine.any(Object));
               expect(result).toBe('Test summary text');
          });

          it('should update summary text when tab changes', () => {
               summaryTextConfigService.buildSummaryText.calls.reset();
               fixture.componentRef.setInput('tab', 'createCredential');
               fixture.detectChanges();

               component.summaryText();

               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 2, 'createCredential', jasmine.any(Object));
          });

          it('should update summary text when credsLength changes', () => {
               summaryTextConfigService.buildSummaryText.calls.reset();
               fixture.componentRef.setInput('credsLength', 10);
               fixture.detectChanges();

               const result = component.summaryText();

               expect(result).toBe('Test summary text');
               expect(summaryTextConfigService.buildSummaryText).toHaveBeenCalledWith('Test Wallet', 10, 'acceptCredential', jasmine.any(Object));
          });
     });

     describe('emptyStateMessage', () => {
          it('should return acceptCredential empty message', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.componentRef.setInput('tab', 'acceptCredential');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no credentials to accept.');
          });

          it('should return createCredential empty message', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.componentRef.setInput('tab', 'createCredential');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not issued any credentials.');
          });

          it('should return deleteCredential empty message', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.componentRef.setInput('tab', 'deleteCredential');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no credentials to delete.');
          });

          it('should return verifyCredential empty message with custom message', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.componentRef.setInput('tab', 'verifyCredential');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not issued any credentials that can be verified here.');
          });

          it('should return generic verifyCredential message when count > 0', () => {
               fixture.componentRef.setInput('credsLength', 5);
               fixture.componentRef.setInput('tab', 'verifyCredential');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('No credentials available for verification.');
          });

          it('should return default message for unknown tab', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.componentRef.setInput('tab', 'unknown' as CredentialActionTypes);
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('No credentials found.');
          });
     });

     describe('emptyStateSubMessage', () => {
          it('should return sub-message for verifyCredential with zero count', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.componentRef.setInput('tab', 'verifyCredential');
               fixture.detectChanges();

               const result = component.emptyStateSubMessage();
               expect(result).toBe('Verification is usually performed by the issuer or an external verifier.');
          });

          it('should return empty string for verifyCredential with count > 0', () => {
               fixture.componentRef.setInput('credsLength', 5);
               fixture.componentRef.setInput('tab', 'verifyCredential');
               fixture.detectChanges();

               const result = component.emptyStateSubMessage();
               expect(result).toBe('');
          });

          it('should return empty string for other tabs', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.componentRef.setInput('tab', 'acceptCredential');
               fixture.detectChanges();

               const result = component.emptyStateSubMessage();
               expect(result).toBe('');
          });
     });

     describe('onCredentialClick', () => {
          const mockCred = mockCreds.list[0];

          it('should not emit when tab is createCredential', () => {
               fixture.componentRef.setInput('tab', 'createCredential');
               fixture.detectChanges();

               spyOn(component.credentialSelected, 'emit');

               component.onCredentialClick(mockCred);

               expect(component.credentialSelected.emit).not.toHaveBeenCalled();
          });

          it('should emit credentialSelected when tab is acceptCredential', () => {
               fixture.componentRef.setInput('tab', 'acceptCredential');
               fixture.detectChanges();

               spyOn(component.credentialSelected, 'emit');

               component.onCredentialClick(mockCred);

               expect(component.credentialSelected.emit).toHaveBeenCalledWith(mockCred);
          });

          it('should emit credentialSelected when tab is deleteCredential', () => {
               fixture.componentRef.setInput('tab', 'deleteCredential');
               fixture.detectChanges();

               spyOn(component.credentialSelected, 'emit');

               component.onCredentialClick(mockCred);

               expect(component.credentialSelected.emit).toHaveBeenCalledWith(mockCred);
          });

          it('should emit credentialSelected when tab is verifyCredential', () => {
               fixture.componentRef.setInput('tab', 'verifyCredential');
               fixture.detectChanges();

               spyOn(component.credentialSelected, 'emit');

               component.onCredentialClick(mockCred);

               expect(component.credentialSelected.emit).toHaveBeenCalledWith(mockCred);
          });
     });

     describe('selectCredential', () => {
          const mockCred = mockCreds.list[0];

          it('should call credentialUtilService.selectCredentialFromList', () => {
               component.selectCredential(mockCred, 'list');

               expect(credentialUtilService.selectCredentialFromList).toHaveBeenCalledWith(mockCred, 'acceptCredential', mockWallet.address);
          });
     });

     describe('canSelectCredential', () => {
          const credentialFromIssuer = { id: 'cred1', Issuer: 'rTestAddress123' } as unknown as CredentialItemVm;
          const credentialFromOther = { id: 'cred2', Issuer: 'rOtherAddress' } as unknown as CredentialItemVm;

          it('should return false when no wallet address', () => {
               fixture.componentRef.setInput('wallet', null);
               fixture.detectChanges();

               const result = component.canSelectCredential(credentialFromIssuer);
               expect(result).toBeFalse();
          });

          it('should return false for createCredential tab', () => {
               fixture.componentRef.setInput('tab', 'createCredential');
               fixture.detectChanges();

               const result = component.canSelectCredential(credentialFromIssuer);
               expect(result).toBeFalse();
          });

          it('should return true for acceptCredential tab', () => {
               fixture.componentRef.setInput('tab', 'acceptCredential');
               fixture.detectChanges();

               const result = component.canSelectCredential(credentialFromIssuer);
               expect(result).toBeTrue();
          });

          it('should return true for deleteCredential tab', () => {
               fixture.componentRef.setInput('tab', 'deleteCredential');
               fixture.detectChanges();

               const result = component.canSelectCredential(credentialFromIssuer);
               expect(result).toBeTrue();
          });

          it('should return true for verifyCredential when issuer matches wallet', () => {
               fixture.componentRef.setInput('tab', 'verifyCredential');
               fixture.detectChanges();

               const result = component.canSelectCredential(credentialFromIssuer);
               expect(result).toBeTrue();
          });

          it('should return false for verifyCredential when issuer does not match wallet', () => {
               fixture.componentRef.setInput('tab', 'verifyCredential');
               fixture.detectChanges();

               const result = component.canSelectCredential(credentialFromOther);
               expect(result).toBeFalse();
          });
     });

     describe('Service injections', () => {
          it('should have copyUtilService injected', () => {
               expect(component.copyUtilService).toBe(copyUtilService);
          });

          it('should have credentialUtilService injected', () => {
               expect(component.credentialUtilService).toBe(credentialUtilService);
          });

          it('should have summaryTextConfigService injected', () => {
               expect(component.summaryTextConfigService).toBe(summaryTextConfigService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have creds list available for template', () => {
               expect(component.creds().list).toBeDefined();
               expect(component.creds().list.length).toBe(2);
          });

          it('should have explorerUrl available for template', () => {
               expect(component.explorerUrl).toBeDefined();
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('Edge cases', () => {
          it('should handle undefined wallet', () => {
               fixture.componentRef.setInput('wallet', undefined);
               fixture.detectChanges();
               expect(component.wallet()).toBeUndefined();
          });

          it('should handle null wallet', () => {
               fixture.componentRef.setInput('wallet', null);
               fixture.detectChanges();
               expect(component.wallet()).toBeNull();
          });

          it('should handle zero credsLength', () => {
               fixture.componentRef.setInput('credsLength', 0);
               fixture.detectChanges();
               expect(component.credsLength()).toBe(0);
          });

          it('should handle empty creds list', () => {
               fixture.componentRef.setInput('creds', { list: [] });
               fixture.detectChanges();
               expect(component.creds().list).toEqual([]);
          });
     });
});
