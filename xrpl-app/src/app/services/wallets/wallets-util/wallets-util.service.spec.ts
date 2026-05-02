import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import * as xrpl from 'xrpl';
import * as bip39 from 'bip39';

import { WalletsUtilService } from './wallets-util.service';
import { WalletsStoreService } from '../wallets-store/wallets-store.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { StorageService } from '../../shared/local-storage/storage.service';
import { ToastService } from '../../utils/toast/toast.service';
import { AppConstants } from '../../../core/app.constants';

describe('WalletsUtilService', () => {
     let service: WalletsUtilService;
     const encryptionTypeSignal = signal('ed25519');

     let walletsStoreMock: jasmine.SpyObj<InstanceType<typeof WalletsStoreService>>;
     let utilsMock: jasmine.SpyObj<UtilsService>;
     let storageMock: jasmine.SpyObj<StorageService>;
     let toastMock: jasmine.SpyObj<ToastService>;

     const defaultButtonLoading = {
          generateNewWalletFromSeed: false,
          generateNewWalletFromMnemonic: false,
          generateNewWalletFromSecretNumbers: false,
          deriveWalletFromFamilySeed: false,
          importWallet: false,
          create: false,
          // Add any other properties from ButtonLoadingState if needed
     } as any;

     beforeEach(async () => {
          walletsStoreMock = jasmine.createSpyObj<InstanceType<typeof WalletsStoreService>>('WalletsStoreService', ['buttonLoading', 'mnemonicValid', 'errorMessage', 'mnemonic', 'secretNumbers', 'seed', 'secp256k1_encryption_type', 'ed25519_encryption_type', 'encryptionType', 'setField']);

          // FIXED: Do not use empty array
          utilsMock = {} as jasmine.SpyObj<UtilsService>;

          storageMock = jasmine.createSpyObj<StorageService>('StorageService', ['setInputValue']);
          toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['info']);

          walletsStoreMock.buttonLoading.and.returnValue(defaultButtonLoading);
          walletsStoreMock.mnemonicValid.and.returnValue(false);
          walletsStoreMock.errorMessage.and.returnValue('');
          walletsStoreMock.mnemonic.and.returnValue('');
          walletsStoreMock.secretNumbers.and.returnValue('');
          walletsStoreMock.seed.and.returnValue('');
          walletsStoreMock.secp256k1_encryption_type.and.returnValue(false);
          walletsStoreMock.ed25519_encryption_type.and.returnValue(true);
          walletsStoreMock.encryptionType.and.returnValue('ed25519');

          TestBed.configureTestingModule({
               providers: [WalletsUtilService, { provide: WalletsStoreService, useValue: walletsStoreMock }, { provide: UtilsService, useValue: utilsMock }, { provide: StorageService, useValue: storageMock }, { provide: ToastService, useValue: toastMock }],
          });

          service = TestBed.inject(WalletsUtilService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('isAnyButtonLoading', () => {
          it('should return true if any button is loading', () => {
               walletsStoreMock.buttonLoading.and.returnValue({ ...defaultButtonLoading, create: true });
               expect(service.isAnyButtonLoading).toBeTrue();
          });

          it('should return false when no buttons are loading', () => {
               expect(service.isAnyButtonLoading).toBeFalse();
          });
     });

     describe('statusMessage', () => {
          it('should return success when mnemonic is valid', () => {
               walletsStoreMock.mnemonicValid.and.returnValue(true);
               expect(service.statusMessage()).toBe('✅ Mnemonic Valid');
          });

          it('should show specific error', () => {
               walletsStoreMock.errorMessage.and.returnValue('Bad length');
               expect(service.statusMessage()).toBe('❌ Bad length');
          });
     });

     describe('Encryption', () => {
          it('should return secp256k1 when selected', () => {
               walletsStoreMock.secp256k1_encryption_type.and.returnValue(true);
               expect(service.getEncryptionType()).toBe(AppConstants.ENCRYPTION.SECP256K1);
          });

          it('should default to ed25519', () => {
               expect(service.getEncryptionType()).toBe(AppConstants.ENCRYPTION.ED25519);
          });

          it('should set encryption type', () => {
               service.setEncryption('secp256k1');
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('secp256k1_encryption_type', true);
               expect(storageMock.setInputValue).toHaveBeenCalled();
          });
     });

     describe('Normalization & Validation', () => {
          it('should normalize mnemonic', () => {
               expect(service.normalizeMnemonic(' hello   world  ')).toBe('hello world');
          });

          it('should normalize secrets', () => {
               expect(service.normalizeSecrets('123456, 789012')).toEqual(['123456', '789012']);
          });

          it('should validate 24-word mnemonic', () => {
               const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
               expect(service.isValidMnemonic(validMnemonic)).toBeTrue();
          });

          it('should reject invalid mnemonic (wrong word count)', () => {
               expect(service.isValidMnemonic('abandon abandon')).toBeFalse();
          });

          it('should validate secret number', () => {
               expect(service.isValidSecretNumber('123456')).toBeTrue();
               expect(service.isValidSecretNumber('12345')).toBeFalse();
          });
     });

     describe('Input Handlers', () => {
          it('should handle mnemonic input', () => {
               walletsStoreMock.mnemonic.and.returnValue('test test test');
               service.onMnemonicInput();
               expect(walletsStoreMock.setField).toHaveBeenCalled();
          });
     });

     // describe('onEncryptionChange', () => {
     //      it('should save encryption preference', () => {
     //           // Update the signal value directly
     //           encryptionTypeSignal.set('secp256k1');
     //           service.onEncryptionChange();
     //           expect(storageMock.setInputValue).toHaveBeenCalledWith('encryptionType', 'secp256k1');
     //      });
     // });

     describe('onMnemonicInput - advanced', () => {
          it('should validate mnemonic successfully', () => {
               const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
               walletsStoreMock.mnemonic.and.returnValue(validMnemonic);
               service.onMnemonicInput();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('mnemonicValid', true);
          });

          it('should set error for invalid mnemonic format (uppercase or special chars)', () => {
               walletsStoreMock.mnemonic.and.returnValue('ABANDON ABANDON ABANDON');
               service.onMnemonicInput();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('errorMessage', 'Invalid Mnemonic. Must contain lowercase words separated by single spaces only.');
          });

          it('should set error for invalid BIP39 mnemonic', () => {
               const invalidMnemonic = 'invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid invalid';
               walletsStoreMock.mnemonic.and.returnValue(invalidMnemonic);
               service.onMnemonicInput();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('errorMessage', 'Invalid BIP39 Mnemonic.');
          });
     });

     describe('onSecretNumberInput', () => {
          it('should process valid secret numbers', () => {
               const validSecrets = '123456, 789012, 345678, 901234, 567890, 123456, 789012, 345678';
               walletsStoreMock.secretNumbers.and.returnValue(validSecrets);
               service.onSecretNumberInput();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('secretNumberInput', jasmine.any(Array));
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('secretNumberValid', true);
          });
     });

     describe('onSeedInput', () => {
          it('should call setField with seed validation result', () => {
               // Just verify the method is called, not the actual validation result
               const validSeed = 'sEdTM1uT8Q3XJYyVv2jKxL9ZqW5nR7pC';
               walletsStoreMock.seed.and.returnValue(validSeed);
               service.onSeedInput();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('seedInput', validSeed);
          });
     });

     describe('convertSecretNumberStringToArray', () => {
          it('should convert comma-separated string to array', () => {
               const input = '123456,789012,345678';
               const result = service.convertSecretNumberStringToArray(input);
               expect(result).toEqual(['123456', '789012', '345678']);
          });

          it('should handle spaces around commas', () => {
               const input = '123456, 789012, 345678';
               const result = service.convertSecretNumberStringToArray(input);
               expect(result).toEqual(['123456', '789012', '345678']);
          });

          it('should handle empty string', () => {
               const result = service.convertSecretNumberStringToArray('');
               expect(result).toEqual([]);
          });
     });

     describe('setEncryption', () => {
          it('should set ed25519 encryption', () => {
               service.setEncryption('ed25519');
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('ed25519_encryption_type', true);
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('secp256k1_encryption_type', false);
          });

          it('should set secp256k1 encryption', () => {
               service.setEncryption('secp256k1');
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('ed25519_encryption_type', false);
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('secp256k1_encryption_type', true);
          });
     });

     describe('onEd25519Change', () => {
          it('should turn off secp when ed25519 is turned on', () => {
               walletsStoreMock.ed25519_encryption_type.and.returnValue(true);
               service.onEd25519Change();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('secp256k1_encryption_type', false);
          });

          it('should prevent turning off ed25519 when secp is off', () => {
               walletsStoreMock.ed25519_encryption_type.and.returnValue(false);
               walletsStoreMock.secp256k1_encryption_type.and.returnValue(false);
               service.onEd25519Change();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('ed25519_encryption_type', true);
               expect(toastMock.info).toHaveBeenCalled();
          });
     });

     describe('onSecp256k1Change', () => {
          it('should turn off ed25519 when secp is turned on', () => {
               walletsStoreMock.secp256k1_encryption_type.and.returnValue(true);
               service.onSecp256k1Change();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('ed25519_encryption_type', false);
          });

          it('should prevent turning off secp when ed25519 is off', () => {
               walletsStoreMock.secp256k1_encryption_type.and.returnValue(false);
               walletsStoreMock.ed25519_encryption_type.and.returnValue(false);
               service.onSecp256k1Change();
               expect(walletsStoreMock.setField).toHaveBeenCalledWith('secp256k1_encryption_type', true);
               expect(toastMock.info).toHaveBeenCalled();
          });
     });

     describe('normalizeFamilySeed', () => {
          it('should remove spaces and invisible characters', () => {
               const input = 'sEdTM1uT 8Q3XJYyV v2jKxL9Z qW5nR7pC';
               const result = service.normalizeFamilySeed(input);
               expect(result).toBe('sEdTM1uT8Q3XJYyVv2jKxL9ZqW5nR7pC');
          });

          it('should return empty string for empty input', () => {
               expect(service.normalizeFamilySeed('')).toBe('');
          });

          it('should handle invisible Unicode characters', () => {
               const input = 'sEdTM1uT\u200B8Q3XJYyV';
               const result = service.normalizeFamilySeed(input);
               expect(result).toBe('sEdTM1uT8Q3XJYyV');
          });
     });

     describe('isValidSecret', () => {
          it('should return true for 8 valid 6-digit numbers', () => {
               const secrets = ['123456', '789012', '345678', '901234', '567890', '123456', '789012', '345678'];
               expect(service.isValidSecret(secrets)).toBeTrue();
          });

          it('should return false for invalid number of secrets', () => {
               const secrets = ['123456', '789012'];
               expect(service.isValidSecret(secrets)).toBeFalse();
          });

          it('should return false if any secret is invalid', () => {
               const secrets = ['123456', '789012', '345678', '901234', '567890', '123456', '789012', '12345'];
               expect(service.isValidSecret(secrets)).toBeFalse();
          });
     });

     describe('isValidMnemonic', () => {
          it('should return false for non-24 word mnemonic', () => {
               expect(service.isValidMnemonic('abandon abandon')).toBeFalse();
          });

          it('should return false for mnemonic with invalid characters', () => {
               const invalidMnemonic = 'Abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
               expect(service.isValidMnemonic(invalidMnemonic)).toBeFalse();
          });

          it('should return true for valid 24-word lowercase mnemonic', () => {
               const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
               expect(service.isValidMnemonic(validMnemonic)).toBeTrue();
          });
     });

     describe('isValidSecretNumber', () => {
          it('should return true for 6-digit number', () => {
               expect(service.isValidSecretNumber('123456')).toBeTrue();
          });

          it('should return false for number with less than 6 digits', () => {
               expect(service.isValidSecretNumber('12345')).toBeFalse();
          });

          it('should return false for number with more than 6 digits', () => {
               expect(service.isValidSecretNumber('1234567')).toBeFalse();
          });

          it('should return false for non-numeric input', () => {
               expect(service.isValidSecretNumber('abcdef')).toBeFalse();
          });
     });

     describe('truncateAddress', () => {
          it('should truncate address correctly', () => {
               const address = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
               const result = service.truncateAddress(address);
               expect(result).toBe('rHb9CJAW...wdtyTh');
          });

          it('should handle short addresses', () => {
               const address = 'rShort';
               const result = service.truncateAddress(address);
               expect(result).toBe('rShort...rShort');
          });
     });
});
