import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, Component } from '@angular/core';
import { PermissionedDomainsSummaryComponent, PermissionedDomainItem } from './permissioned-domains-summary.component';
import { CopyUtilService } from '../../../../services/utils/copy-util/copy-util.service';
import { PermissionedDomainStoreService } from '../../../../services/permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { TransactionUiService } from '../../../../services/transaction-ui/transaction-ui.service';
import { UtilsService } from '../../../../services/utils/util-service/utils.service';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';

// Mock child components
@Component({ selector: 'app-summary-container', template: '<div>Mock Summary Container</div>', standalone: true })
class MockSummaryContainer {}

@Component({ selector: 'app-summary-item', template: '<div>Mock Summary Item</div>', standalone: true })
class MockSummaryItem {}

@Component({ selector: 'app-summary-key-value', template: '<div>Mock Key Value</div>', standalone: true })
class MockSummaryKeyValue {}

@Component({ selector: 'app-tooltip-link', template: '<div>Mock Tooltip Link</div>', standalone: true })
class MockTooltipLink {}

describe('PermissionedDomainsSummaryComponent', () => {
     let component: PermissionedDomainsSummaryComponent;
     let fixture: ComponentFixture<PermissionedDomainsSummaryComponent>;

     // Services
     let copyUtilServiceSpy: jasmine.SpyObj<CopyUtilService>;
     let permissionedDomainStoreServiceSpy: any;
     let txUiServiceSpy: any;
     let utilsServiceSpy: jasmine.SpyObj<UtilsService>;

     // Mock data
     const mockDomains: PermissionedDomainItem[] = [
          {
               index: 'domain123',
               Domain: 'example.com',
               AcceptedCredentials: [
                    { CredentialType: 'KYC-Level1', Issuer: 'rIssuer1' },
                    { CredentialType: 'KYC-Level2', Issuer: 'rIssuer1' },
                    { CredentialType: 'AML-Approved', Issuer: 'rIssuer2' },
               ],
          },
          {
               index: 'domain456',
               Domain: 'test.com',
               AcceptedCredentials: [{ CredentialType: 'Basic', Issuer: 'rIssuer3' }],
          },
     ];

     const mockInfoData = {
          walletName: 'Test Wallet',
          permissionedDomainCount: 2,
          permissionedDomainsToShow: mockDomains,
     };

     beforeEach(async () => {
          // Create spies
          copyUtilServiceSpy = jasmine.createSpyObj('CopyUtilService', ['copyAndToast']);
          utilsServiceSpy = jasmine.createSpyObj('UtilsService', ['normalizeCurrencyCode']);

          permissionedDomainStoreServiceSpy = {
               selectedDomainId: signal(''),
               setField: jasmine.createSpy('setField'),
          };

          txUiServiceSpy = {
               explorerUrl: signal('https://testnet.xrpl.org/'),
          };

          await TestBed.configureTestingModule({
               imports: [PermissionedDomainsSummaryComponent],
               providers: [provideNoopAnimations(), provideIcons({}), { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true }, { provide: CopyUtilService, useValue: copyUtilServiceSpy }, { provide: PermissionedDomainStoreService, useValue: permissionedDomainStoreServiceSpy }, { provide: TransactionUiService, useValue: txUiServiceSpy }, { provide: UtilsService, useValue: utilsServiceSpy }],
          })
               .overrideComponent(PermissionedDomainsSummaryComponent, {
                    set: {
                         template: '<div>Test Component</div>',
                         imports: [],
                    },
               })
               .compileComponents();

          fixture = TestBed.createComponent(PermissionedDomainsSummaryComponent);
          component = fixture.componentInstance;

          // Set required inputs
          fixture.componentRef.setInput('info', mockInfoData);
          fixture.componentRef.setInput('tab', 'setPermissionedDomain');
          fixture.componentRef.setInput('summaryMessage', 'Test summary message');
          fixture.componentRef.setInput('infoPanelExpanded', false);

          fixture.detectChanges();
     });

     afterEach(() => {
          if (permissionedDomainStoreServiceSpy.setField) {
               permissionedDomainStoreServiceSpy.setField.calls.reset();
          }
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Inputs', () => {
          it('should have required info input', () => {
               expect(component.info()).toEqual(mockInfoData);
          });

          it('should accept null info', () => {
               fixture.componentRef.setInput('info', null);
               fixture.detectChanges();
               expect(component.info()).toBeNull();
          });

          it('should have tab input', () => {
               expect(component.tab()).toBe('setPermissionedDomain');
          });

          it('should accept delete tab', () => {
               fixture.componentRef.setInput('tab', 'deletePermissionedDomain');
               fixture.detectChanges();
               expect(component.tab()).toBe('deletePermissionedDomain');
          });

          it('should have summaryMessage input', () => {
               expect(component.summaryMessage()).toBe('Test summary message');
          });

          it('should have infoPanelExpanded input with default false', () => {
               expect(component.infoPanelExpanded()).toBeFalse();
          });

          it('should accept infoPanelExpanded as true', () => {
               fixture.componentRef.setInput('infoPanelExpanded', true);
               fixture.detectChanges();
               expect(component.infoPanelExpanded()).toBeTrue();
          });
     });

     describe('Outputs', () => {
          it('should emit toggleInfoPanel when called', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               component.toggleInfoPanel.emit();
               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
          });
     });

     describe('emptyStateMessage', () => {
          it('should return empty string when domains exist', () => {
               const result = component.emptyStateMessage();
               expect(result).toBe('');
          });

          it('should return create message for setPermissionedDomain tab with no domains', () => {
               fixture.componentRef.setInput('info', { ...mockInfoData, permissionedDomainCount: 0 });
               fixture.componentRef.setInput('tab', 'setPermissionedDomain');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has not created any Permissioned Domains yet.');
          });

          it('should return delete message for deletePermissionedDomain tab with no domains', () => {
               fixture.componentRef.setInput('info', { ...mockInfoData, permissionedDomainCount: 0 });
               fixture.componentRef.setInput('tab', 'deletePermissionedDomain');
               fixture.detectChanges();

               const result = component.emptyStateMessage();
               expect(result).toBe('This wallet has no Permissioned Domains to delete.');
          });
     });

     describe('isSelected', () => {
          it('should return false for setPermissionedDomain tab', () => {
               fixture.componentRef.setInput('tab', 'setPermissionedDomain');
               fixture.detectChanges();

               const result = component.isSelected('domain123');
               expect(result).toBeFalse();
          });

          it('should return true when domain matches selectedDomainId on delete tab', () => {
               fixture.componentRef.setInput('tab', 'deletePermissionedDomain');
               fixture.detectChanges();

               permissionedDomainStoreServiceSpy.selectedDomainId.set('domain123');

               const result = component.isSelected('domain123');
               expect(result).toBeTrue();
          });

          it('should return false when domain does not match selectedDomainId on delete tab', () => {
               fixture.componentRef.setInput('tab', 'deletePermissionedDomain');
               fixture.detectChanges();

               permissionedDomainStoreServiceSpy.selectedDomainId.set('domain456');

               const result = component.isSelected('domain123');
               expect(result).toBeFalse();
          });
     });

     describe('selectDomain', () => {
          it('should not select domain on setPermissionedDomain tab', () => {
               // Set up spy on toggleInfoPanel.emit before calling the method
               spyOn(component.toggleInfoPanel, 'emit');
               fixture.componentRef.setInput('tab', 'setPermissionedDomain');
               fixture.detectChanges();

               const domain = mockDomains[0];
               component.selectDomain(domain);

               expect(permissionedDomainStoreServiceSpy.setField).not.toHaveBeenCalled();
               expect(component.toggleInfoPanel.emit).not.toHaveBeenCalled();
          });

          it('should select domain on deletePermissionedDomain tab', () => {
               spyOn(component.toggleInfoPanel, 'emit');
               fixture.componentRef.setInput('tab', 'deletePermissionedDomain');
               fixture.detectChanges();

               const domain = mockDomains[0];
               component.selectDomain(domain);

               expect(component.toggleInfoPanel.emit).toHaveBeenCalled();
               expect(permissionedDomainStoreServiceSpy.setField).toHaveBeenCalledWith('selectedDomainId', 'domain123');
          });
     });

     describe('groupCredentialsByIssuer', () => {
          it('should return empty array for null/undefined credentials', () => {
               const result = component.groupCredentialsByIssuer(null as any);
               expect(result).toEqual([]);
          });

          it('should return empty array for empty credentials', () => {
               const result = component.groupCredentialsByIssuer([]);
               expect(result).toEqual([]);
          });

          it('should group credentials by issuer', () => {
               const credentials = [
                    { CredentialType: 'KYC-Level1', Issuer: 'rIssuer1' },
                    { CredentialType: 'KYC-Level2', Issuer: 'rIssuer1' },
                    { CredentialType: 'AML-Approved', Issuer: 'rIssuer2' },
               ];

               const result = component.groupCredentialsByIssuer(credentials);

               expect(result.length).toBe(2);
               expect(result[0].issuer).toBe('rIssuer1');
               expect(result[0].types).toEqual(['KYC-Level1', 'KYC-Level2']);
               expect(result[1].issuer).toBe('rIssuer2');
               expect(result[1].types).toEqual(['AML-Approved']);
          });

          it('should handle single credential per issuer', () => {
               const credentials = [
                    { CredentialType: 'Basic', Issuer: 'rIssuer1' },
                    { CredentialType: 'Standard', Issuer: 'rIssuer2' },
               ];

               const result = component.groupCredentialsByIssuer(credentials);

               expect(result.length).toBe(2);
               expect(result[0].types).toEqual(['Basic']);
               expect(result[1].types).toEqual(['Standard']);
          });
     });

     describe('explorerUrl', () => {
          it('should return explorerUrl from txUiService', () => {
               expect(component.explorerUrl()).toBe('https://testnet.xrpl.org/');
          });
     });

     describe('Service injections', () => {
          it('should have copyUtilService injected', () => {
               expect(component.copyUtilService).toBe(copyUtilServiceSpy);
          });

          it('should have utilsService injected', () => {
               expect(component.utilsService).toBe(utilsServiceSpy);
          });

          it('should have permissionedDomainStoreService injected', () => {
               expect(component.permissionedDomainStoreService).toBe(permissionedDomainStoreServiceSpy);
          });
     });

     describe('Edge Cases', () => {
          it('should handle info with undefined permissionedDomainsToShow', () => {
               fixture.componentRef.setInput('info', {
                    walletName: 'Test',
                    permissionedDomainCount: 0,
                    permissionedDomainsToShow: undefined,
               });
               fixture.detectChanges();

               expect(component.info()).toBeDefined();
               expect(component.emptyStateMessage()).toBe('This wallet has not created any Permissioned Domains yet.');
          });
     });
});
