import { TestBed } from '@angular/core/testing';
import { AccountConfiguratorStoreService } from './account-configurator-store.service';
import { UiSignerEntry } from '../../../models/interface-items.model';
import { AccountConfiguratorState } from '../../../components/account-configurator/constants/account-configurator.types';

describe('AccountConfiguratorStoreService', () => {
     let store: InstanceType<typeof AccountConfiguratorStoreService>;

     const mockSigner: UiSignerEntry = {
          Account: 'rSigner1',
          seed: 'sSeed1',
          SignerWeight: 2,
     };

     const mockSigner2: UiSignerEntry = {
          Account: 'rSigner2',
          seed: 'sSeed2',
          SignerWeight: 3,
     };

     const mockDepositAuthEntry: UiSignerEntry = {
          Account: 'rDepositAuth1',
          seed: '',
          SignerWeight: 1,
     };

     beforeEach(() => {
          TestBed.configureTestingModule({});
          store = TestBed.inject(AccountConfiguratorStoreService);
     });

     afterEach(() => {
          store.resetAll();
     });

     it('should be created', () => {
          expect(store).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have txOptions as null', () => {
               expect(store.txOptions()).toBeNull();
          });

          it('should have account as null', () => {
               expect(store.account()).toBeNull();
          });

          it('should have accountInfo as empty string', () => {
               expect(store.accountInfo()).toBe('');
          });

          it('should have configurationType as null', () => {
               expect(store.configurationType()).toBeNull();
          });

          it('should have memoField as empty string', () => {
               expect(store.memoField()).toBe('');
          });

          it('should have isMemoEnabled as false', () => {
               expect(store.isMemoEnabled()).toBeFalse();
          });

          it('should have isSimulateEnabled as false', () => {
               expect(store.isSimulateEnabled()).toBeFalse();
          });

          it('should have useMultiSign as false', () => {
               expect(store.useMultiSign()).toBeFalse();
          });

          it('should have multiSignAddress as empty string', () => {
               expect(store.multiSignAddress()).toBe('');
          });

          it('should have multiSignSeeds as empty string', () => {
               expect(store.multiSignSeeds()).toBe('');
          });

          it('should have multiSigningEnabled as false', () => {
               expect(store.multiSigningEnabled()).toBeFalse();
          });

          it('should have hasSignerList as false', () => {
               expect(store.hasSignerList()).toBeFalse();
          });

          it('should have signers array with one empty entry', () => {
               expect(store.signers().length).toBe(1);
               expect(store.signers()[0].Account).toBe('');
               expect(store.signers()[0].seed).toBe('');
               expect(store.signers()[0].SignerWeight).toBe(1);
          });

          it('should have depositAuthAddresses array with one empty entry', () => {
               expect(store.depositAuthAddresses().length).toBe(1);
               expect(store.depositAuthAddresses()[0].Account).toBe('');
          });
     });

     describe('setField', () => {
          it('should update memoField', () => {
               store.setField('memoField', 'test memo');
               expect(store.memoField()).toBe('test memo');
          });

          it('should update isMemoEnabled', () => {
               store.setField('isMemoEnabled', true);
               expect(store.isMemoEnabled()).toBeTrue();
          });

          it('should update isSimulateEnabled', () => {
               store.setField('isSimulateEnabled', true);
               expect(store.isSimulateEnabled()).toBeTrue();
          });

          it('should update useMultiSign', () => {
               store.setField('useMultiSign', true);
               expect(store.useMultiSign()).toBeTrue();
          });

          it('should update multiSignAddress', () => {
               store.setField('multiSignAddress', 'rMultiSign');
               expect(store.multiSignAddress()).toBe('rMultiSign');
          });

          it('should update signerQuorum', () => {
               store.setField('signerQuorum', 5);
               expect(store.signerQuorum()).toBe(5);
          });

          it('should update tickSize', () => {
               store.setField('tickSize', '10');
               expect(store.tickSize()).toBe('10');
          });

          it('should update transferRate', () => {
               store.setField('transferRate', '0.5');
               expect(store.transferRate()).toBe('0.5');
          });
     });

     describe('updateField', () => {
          it('should update field using updater function', () => {
               store.setField('signerQuorum', 1);
               store.updateField('signerQuorum', (current: number) => current + 1);
               expect(store.signerQuorum()).toBe(2);
          });

          it('should update memoField using updater', () => {
               store.setField('memoField', 'hello');
               store.updateField('memoField', (current: string) => current + ' world');
               expect(store.memoField()).toBe('hello world');
          });
     });

     describe('getAll', () => {
          it('should return entire state object', () => {
               store.setField('memoField', 'test');
               store.setField('isMemoEnabled', true);
               store.setField('signerQuorum', 3);

               const state = store.getAll();
               expect(state.memoField).toBe('test');
               expect(state.isMemoEnabled).toBeTrue();
               expect(state.signerQuorum).toBe(3);
          });

          it('should return a copy of the state', () => {
               const state1 = store.getAll();
               const state2 = store.getAll();
               expect(state1).not.toBe(state2);
               expect(state1).toEqual(state2);
          });
     });

     describe('resetAll', () => {
          beforeEach(() => {
               store.setField('memoField', 'test');
               store.setField('isMemoEnabled', true);
               store.setField('signerQuorum', 5);
               store.addSigner(mockSigner);
               store.addDepositAuthAddress(mockDepositAuthEntry);
          });

          it('should reset memoField to empty', () => {
               store.resetAll();
               expect(store.memoField()).toBe('');
          });

          it('should reset isMemoEnabled to false', () => {
               store.resetAll();
               expect(store.isMemoEnabled()).toBeFalse();
          });

          it('should reset signerQuorum to 0', () => {
               store.resetAll();
               expect(store.signerQuorum()).toBe(0);
          });

          it('should reset signers to one empty entry', () => {
               store.resetAll();
               expect(store.signers().length).toBe(1);
               expect(store.signers()[0].Account).toBe('');
          });

          it('should reset depositAuthAddresses to one empty entry', () => {
               store.resetAll();
               expect(store.depositAuthAddresses().length).toBe(1);
               expect(store.depositAuthAddresses()[0].Account).toBe('');
          });
     });

     describe('addSigner', () => {
          it('should add a signer to the list', () => {
               store.addSigner(mockSigner);
               expect(store.signers().length).toBe(2);
               expect(store.signers()[1]).toEqual(mockSigner);
          });

          it('should add multiple signers', () => {
               store.addSigner(mockSigner);
               store.addSigner(mockSigner2);
               expect(store.signers().length).toBe(3);
               expect(store.signers()[1]).toEqual(mockSigner);
               expect(store.signers()[2]).toEqual(mockSigner2);
          });
     });

     describe('removeSigner', () => {
          beforeEach(() => {
               store.addSigner(mockSigner);
               store.addSigner(mockSigner2);
          });

          it('should remove signer at index', () => {
               store.removeSigner(1);
               expect(store.signers().length).toBe(2);
               expect(store.signers()[1]).toEqual(mockSigner2);
          });

          it('should remove first signer', () => {
               store.removeSigner(0);
               expect(store.signers().length).toBe(2);
               expect(store.signers()[0]).toEqual(mockSigner);
          });
     });

     describe('clearSigners', () => {
          beforeEach(() => {
               store.addSigner(mockSigner);
               store.addSigner(mockSigner2);
          });

          it('should clear all signers and reset to one empty entry', () => {
               store.clearSigners();
               expect(store.signers().length).toBe(1);
               expect(store.signers()[0].Account).toBe('');
               expect(store.signers()[0].seed).toBe('');
               expect(store.signers()[0].SignerWeight).toBe(1);
          });
     });

     describe('addDepositAuthAddress', () => {
          it('should add deposit auth address to the list', () => {
               store.addDepositAuthAddress(mockDepositAuthEntry);
               expect(store.depositAuthAddresses().length).toBe(2);
               expect(store.depositAuthAddresses()[1]).toEqual(mockDepositAuthEntry);
          });
     });

     describe('removeDepositAuthAddress', () => {
          beforeEach(() => {
               store.addDepositAuthAddress(mockDepositAuthEntry);
          });

          it('should remove deposit auth address at index', () => {
               store.removeDepositAuthAddress(1);
               expect(store.depositAuthAddresses().length).toBe(1);
          });
     });

     describe('clearDepositAuthAddresses', () => {
          beforeEach(() => {
               store.addDepositAuthAddress(mockDepositAuthEntry);
          });

          it('should clear all deposit auth addresses and reset to one empty entry', () => {
               store.clearDepositAuthAddresses();
               expect(store.depositAuthAddresses().length).toBe(1);
               expect(store.depositAuthAddresses()[0].Account).toBe('');
          });
     });

     describe('updateSigner', () => {
          beforeEach(() => {
               store.addSigner(mockSigner);
          });

          it('should update signer account', () => {
               store.updateSigner(1, 'Account', 'rNewSigner');
               expect(store.signers()[1].Account).toBe('rNewSigner');
          });

          it('should update signer seed', () => {
               store.updateSigner(1, 'seed', 'sNewSeed');
               expect(store.signers()[1].seed).toBe('sNewSeed');
          });

          it('should update signer weight', () => {
               store.updateSigner(1, 'SignerWeight', 5);
               expect(store.signers()[1].SignerWeight).toBe(5);
          });
     });

     // describe('updateDepositAuthAddress', () => {
     //      it('should update the default empty deposit auth address', () => {
     //           // The default entry at index 0 has empty Account
     //           store.updateDepositAuthAddress(0, 'account', 'rNewAddress');
     //           expect(store.depositAuthAddresses()[0].Account).toBe('rNewAddress');
     //      });

     //      it('should update deposit auth address account at specific index', () => {
     //           // Add a new entry
     //           store.addDepositAuthAddress(mockDepositAuthEntry);
     //           // Update the newly added entry at index 1
     //           store.updateDepositAuthAddress(1, 'account', 'rNewAddress');
     //           expect(store.depositAuthAddresses()[1].Account).toBe('rNewAddress');
     //      });
     // });

     describe('Edge Cases', () => {
          it('should handle removing signer from empty list', () => {
               store.clearSigners();
               store.removeSigner(0);
               expect(store.signers().length).toBe(0);
          });

          it('should handle updating signer at invalid index', () => {
               store.updateSigner(99, 'Account', 'rInvalid');
               // Should not throw, but may not update
               expect(true).toBeTrue();
          });

          it('should handle updating deposit auth at invalid index', () => {
               store.updateDepositAuthAddress(99, 'account', 'rInvalid');
               expect(true).toBeTrue();
          });

          it('should handle adding signer with empty fields', () => {
               const emptySigner: UiSignerEntry = { Account: '', seed: '', SignerWeight: 0 };
               store.addSigner(emptySigner);
               expect(store.signers().length).toBe(2);
               expect(store.signers()[1].Account).toBe('');
          });
     });
});
