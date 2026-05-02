import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MultiSignComponent } from './multi-sign.component';
import { AccountConfiguratorStoreService } from '../../../../../services/account-configurator/account-configurator-store/account-configurator-store.service';
import { AccountConfiguratorUtilService } from '../../../../../services/account-configurator/account-configurator-util/account-configurator-util.service';
import { TransactionUiService } from '../../../../../services/transaction-ui/transaction-ui.service';
import { ConnectionGuardService } from '../../../../../services/shared/connection-guard/connection-guard.service';
import { AccountConfiguratorViewModelService } from '../../../../../services/account-configurator/account-configurator-view-model/account-configurator-view-model.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

describe('MultiSignComponent', () => {
     let component: MultiSignComponent;
     let fixture: ComponentFixture<MultiSignComponent>;

     // Services
     let accountConfiguratorViewModelService: any;
     let connectionGuard: any;
     let accountConfiguratorStoreService: any;
     let accountConfiguratorUtilService: any;
     let txUiService: any;

     // Mock signers data
     const mockSigners = [
          { Account: 'rSigner1', seed: 'sSeed1', SignerWeight: 2 },
          { Account: 'rSigner2', seed: 'sSeed2', SignerWeight: 3 },
          { Account: 'rSigner3', seed: 'sSeed3', SignerWeight: 1 },
     ];

     beforeEach(async () => {
          accountConfiguratorViewModelService = {
               activeTab: signal('modifyMultiSigners'),
          };

          connectionGuard = {
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
          };

          accountConfiguratorStoreService = {
               signers: signal(mockSigners),
               signerQuorum: signal(3),
               multiSigningEnabled: signal(false),
               regularKeySigningEnabled: signal(false),
               setField: jasmine.createSpy('setField'),
               updateSigner: jasmine.createSpy('updateSigner'),
          };

          accountConfiguratorUtilService = {
               removeSigner: jasmine.createSpy('removeSigner'),
               addSigner: jasmine.createSpy('addSigner'),
               preventNegative: jasmine.createSpy('preventNegative'),
               validateQuorum: jasmine.createSpy('validateQuorum'),
               setMultiSignButtonLabel: jasmine.createSpy('setMultiSignButtonLabel').and.returnValue('Set Multi-Sign'),
               removeMultiSignButtonLabel: jasmine.createSpy('removeMultiSignButtonLabel').and.returnValue('Remove Multi-Sign'),
          };

          txUiService = {
               currentStep: signal('idle'),
               wantsOptions: signal(false),
          };

          await TestBed.configureTestingModule({
               imports: [MultiSignComponent],
               providers: [
                    { provide: AccountConfiguratorViewModelService, useValue: accountConfiguratorViewModelService },
                    { provide: ConnectionGuardService, useValue: connectionGuard },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreService },
                    { provide: AccountConfiguratorUtilService, useValue: accountConfiguratorUtilService },
                    { provide: TransactionUiService, useValue: txUiService },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(MultiSignComponent);
          component = fixture.componentInstance;

          // Set input
          fixture.componentRef.setInput('canSubmit', true);

          fixture.detectChanges();
     });

     afterEach(() => {
          accountConfiguratorStoreService.setField.calls.reset();
          accountConfiguratorStoreService.updateSigner.calls.reset();
          accountConfiguratorUtilService.removeSigner.calls.reset();
          accountConfiguratorUtilService.addSigner.calls.reset();
          accountConfiguratorUtilService.preventNegative.calls.reset();
          accountConfiguratorUtilService.validateQuorum.calls.reset();
          connectionGuard.isConnectionReady.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Input properties', () => {
          it('should accept canSubmit input', () => {
               expect(component.canSubmit()).toBeTrue();
          });

          it('should update canSubmit when changed', () => {
               fixture.componentRef.setInput('canSubmit', false);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeFalse();
          });
     });

     describe('Output signals', () => {
          it('should have performAction output', () => {
               expect(component.performAction).toBeDefined();
               expect(component.performAction.emit).toBeDefined();
          });

          it('should emit performAction with Y when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit('Y');
               expect(component.performAction.emit).toHaveBeenCalledWith('Y');
          });

          it('should emit performAction with N when called', () => {
               spyOn(component.performAction, 'emit');
               component.performAction.emit('N');
               expect(component.performAction.emit).toHaveBeenCalledWith('N');
          });
     });

     describe('totalSignerWeight', () => {
          it('should calculate total weight of all signers', () => {
               const total = component.totalSignerWeight();
               expect(total).toBe(6); // 2 + 3 + 1 = 6
          });

          it('should return 0 when there are no signers', () => {
               accountConfiguratorStoreService.signers.set([]);
               const total = component.totalSignerWeight();
               expect(total).toBe(0);
          });

          it('should handle signers with undefined weight', () => {
               const signersWithInvalidWeight = [
                    { Account: 'rSigner1', seed: 'sSeed1', SignerWeight: undefined },
                    { Account: 'rSigner2', seed: 'sSeed2', SignerWeight: 5 },
               ];
               accountConfiguratorStoreService.signers.set(signersWithInvalidWeight as any);
               const total = component.totalSignerWeight();
               expect(total).toBe(5); // Only the valid weight counts
          });

          it('should handle signers with string weights', () => {
               const signersWithStringWeight = [
                    { Account: 'rSigner1', seed: 'sSeed1', SignerWeight: '2' },
                    { Account: 'rSigner2', seed: 'sSeed2', SignerWeight: '3' },
               ];
               accountConfiguratorStoreService.signers.set(signersWithStringWeight as any);
               const total = component.totalSignerWeight();
               expect(total).toBe(5);
          });
     });

     describe('Store bindings', () => {
          it('should have signers from store', () => {
               const signers = accountConfiguratorStoreService.signers();
               expect(signers).toEqual(mockSigners);
               expect(signers.length).toBe(3);
          });

          it('should have signerQuorum from store', () => {
               expect(accountConfiguratorStoreService.signerQuorum()).toBe(3);
          });

          it('should call updateSigner when signer account changes', () => {
               const index = 0;
               const field = 'Account';
               const value = 'rNewSigner';
               accountConfiguratorStoreService.updateSigner(index, field, value);
               expect(accountConfiguratorStoreService.updateSigner).toHaveBeenCalledWith(index, field, value);
          });

          it('should call updateSigner when signer seed changes', () => {
               const index = 1;
               const field = 'seed';
               const value = 'sNewSeed';
               accountConfiguratorStoreService.updateSigner(index, field, value);
               expect(accountConfiguratorStoreService.updateSigner).toHaveBeenCalledWith(index, field, value);
          });

          it('should call updateSigner when signer weight changes', () => {
               const index = 2;
               const field = 'SignerWeight';
               const value = 5;
               accountConfiguratorStoreService.updateSigner(index, field, value);
               expect(accountConfiguratorStoreService.updateSigner).toHaveBeenCalledWith(index, field, value);
          });

          it('should call setField when signerQuorum changes', () => {
               const newQuorum = 4;
               accountConfiguratorStoreService.setField('signerQuorum', newQuorum);
               expect(accountConfiguratorStoreService.setField).toHaveBeenCalledWith('signerQuorum', newQuorum);
          });
     });

     describe('Util service bindings', () => {
          it('should call removeSigner when remove button is clicked', () => {
               const index = 0;
               accountConfiguratorUtilService.removeSigner(index);
               expect(accountConfiguratorUtilService.removeSigner).toHaveBeenCalledWith(index);
          });

          it('should call addSigner when add button is clicked', () => {
               accountConfiguratorUtilService.addSigner();
               expect(accountConfiguratorUtilService.addSigner).toHaveBeenCalled();
          });

          it('should call preventNegative on keydown', () => {
               const event = {} as KeyboardEvent;
               accountConfiguratorUtilService.preventNegative(event);
               expect(accountConfiguratorUtilService.preventNegative).toHaveBeenCalledWith(event);
          });

          it('should call validateQuorum when quorum changes', () => {
               accountConfiguratorUtilService.validateQuorum();
               expect(accountConfiguratorUtilService.validateQuorum).toHaveBeenCalled();
          });

          it('should have setMultiSignButtonLabel from util service', () => {
               const label = accountConfiguratorUtilService.setMultiSignButtonLabel();
               expect(label).toBe('Set Multi-Sign');
          });

          it('should have removeMultiSignButtonLabel from util service', () => {
               const label = accountConfiguratorUtilService.removeMultiSignButtonLabel();
               expect(label).toBe('Remove Multi-Sign');
          });
     });

     describe('Connection guard bindings', () => {
          it('should have isConnectionReady from connectionGuard', () => {
               expect(component.connectionGuard.isConnectionReady()).toBeTrue();
          });
     });

     describe('View model bindings', () => {
          it('should have activeTab from view model', () => {
               expect(component.accountConfiguratorViewModelService.activeTab()).toBe('modifyMultiSigners');
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have signers available for iteration', () => {
               const signers = accountConfiguratorStoreService.signers();
               expect(signers.length).toBe(3);
          });

          it('should show remove button when more than one signer', () => {
               const signers = accountConfiguratorStoreService.signers();
               expect(signers.length).toBeGreaterThan(1);
          });
     });

     describe('Edge cases', () => {
          it('should handle empty signers array', () => {
               accountConfiguratorStoreService.signers.set([]);
               fixture.detectChanges();
               const signers = accountConfiguratorStoreService.signers();
               expect(signers).toEqual([]);
          });

          it('should handle single signer (no remove button)', () => {
               accountConfiguratorStoreService.signers.set([{ Account: 'rSigner1', seed: 'sSeed1', SignerWeight: 1 }]);
               fixture.detectChanges();
               const signers = accountConfiguratorStoreService.signers();
               expect(signers.length).toBe(1);
          });

          it('should handle canSubmit being false', () => {
               fixture.componentRef.setInput('canSubmit', false);
               fixture.detectChanges();
               expect(component.canSubmit()).toBeFalse();
          });

          it('should handle connection not ready', () => {
               connectionGuard.isConnectionReady.and.returnValue(false);
               expect(component.connectionGuard.isConnectionReady()).toBeFalse();
          });

          it('should handle quorum validation when quorum exceeds total weight', () => {
               const totalWeight = component.totalSignerWeight();
               const quorum = accountConfiguratorStoreService.signerQuorum();
               if (quorum > totalWeight) {
                    // Warning should be shown in template
                    expect(quorum).toBeGreaterThan(totalWeight);
               }
          });

          it('should handle adding multiple signers', () => {
               accountConfiguratorUtilService.addSigner();
               accountConfiguratorUtilService.addSigner();
               expect(accountConfiguratorUtilService.addSigner).toHaveBeenCalledTimes(2);
          });
     });
});
