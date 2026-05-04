import { TestBed } from '@angular/core/testing';
import { SignTransactionUtilService } from './sign-transaction-util.service';
import { SignTransationStoreService } from '../sign-transaction-store/sign-transation-store.service';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { signal, WritableSignal } from '@angular/core';
import * as xrpl from 'xrpl';

// Mock Buffer for tests
(window as any).Buffer = {
     from: (str: string) => ({
          toString: () => {
               let hex = '';
               for (let i = 0; i < str.length; i++) {
                    const charCode = str.charCodeAt(i);
                    hex += charCode.toString(16).padStart(2, '0');
               }
               return hex;
          },
     }),
};

describe('SignTransactionUtilService', () => {
     let service: SignTransactionUtilService;
     let mockSignTransationStoreService: any;
     let mockXrplService: jasmine.SpyObj<XrplService>;
     let mockTxUiService: jasmine.SpyObj<TransactionUiService>;
     let mockUtilsService: jasmine.SpyObj<UtilsService>;

     let selectedTransactionSignal: WritableSignal<string>;
     let buttonLoadingSignal: WritableSignal<any>;
     let currentStepSignal: WritableSignal<string>;
     let stepMessageSignal: WritableSignal<string>;

     beforeEach(() => {
          selectedTransactionSignal = signal<string>('sendXrp');
          buttonLoadingSignal = signal({
               getJson: false,
               signed: false,
               submit: false,
               multiSign: false,
               regularKeySign: false,
          });
          currentStepSignal = signal<string>('idle');
          stepMessageSignal = signal<string>('');

          mockSignTransationStoreService = {
               selectedTransaction: selectedTransactionSignal,
               buttonLoading: buttonLoadingSignal,
               setField: jasmine.createSpy(),
               getAll: jasmine.createSpy(),
          };
          mockXrplService = jasmine.createSpyObj('XrplService', ['checkTicketExists']);
          mockTxUiService = jasmine.createSpyObj('TransactionUiService', ['currentStep', 'stepMessage']);
          mockUtilsService = jasmine.createSpyObj('UtilsService', ['setTicketSequence']);

          // Create mock signals with proper types
          Object.defineProperty(mockTxUiService, 'currentStep', {
               get: () => currentStepSignal,
               set: (value: any) => {},
          });
          Object.defineProperty(mockTxUiService, 'stepMessage', {
               get: () => stepMessageSignal,
               set: (value: any) => {},
          });

          TestBed.configureTestingModule({
               providers: [SignTransactionUtilService, { provide: SignTransationStoreService, useValue: mockSignTransationStoreService }, { provide: XrplService, useValue: mockXrplService }, { provide: TransactionUiService, useValue: mockTxUiService }, { provide: UtilsService, useValue: mockUtilsService }],
          });

          service = TestBed.inject(SignTransactionUtilService);
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });
     });

     describe('isAnyButtonLoading', () => {
          it('should return true when any button is loading', () => {
               buttonLoadingSignal.set({ getJson: true, signed: false, submit: false, multiSign: false, regularKeySign: false });
               expect(service.isAnyButtonLoading).toBe(true);
          });

          it('should return false when no button is loading', () => {
               buttonLoadingSignal.set({ getJson: false, signed: false, submit: false, multiSign: false, regularKeySign: false });
               expect(service.isAnyButtonLoading).toBe(false);
          });
     });

     describe('transactionTypeItems', () => {
          it('should return array of transaction type items', () => {
               const items = service.transactionTypeItems();
               expect(items.length).toBeGreaterThan(0);
               expect(items[0].id).toBe('sendXrp');
          });

          it('should mark current selected transaction as current token', () => {
               selectedTransactionSignal.set('setTrustline');
               const items = service.transactionTypeItems();
               const trustlineItem = items.find(i => i.id === 'setTrustline');
               expect(trustlineItem?.isCurrentToken).toBe(true);
          });
     });

     describe('getTransactionJsonButtonLabel', () => {
          it('should return default label when idle and not loading', () => {
               currentStepSignal.set('idle');
               buttonLoadingSignal.set({ ...buttonLoadingSignal(), getJson: false });
               expect(service.getTransactionJsonButtonLabel()).toBe('Get Transaction JSON');
          });

          it('should return step message when processing', () => {
               currentStepSignal.set('preparing');
               stepMessageSignal.set('Preparing...');
               buttonLoadingSignal.set({ ...buttonLoadingSignal(), getJson: true });
               expect(service.getTransactionJsonButtonLabel()).toBe('Preparing...');
          });
     });

     describe('signTransactionButtonLabel', () => {
          it('should return default label when idle and not loading', () => {
               currentStepSignal.set('idle');
               buttonLoadingSignal.set({ ...buttonLoadingSignal(), signed: false });
               expect(service.signTransactionButtonLabel()).toBe('Signed Transaction');
          });

          it('should return step message when processing', () => {
               currentStepSignal.set('signing');
               stepMessageSignal.set('Signing...');
               buttonLoadingSignal.set({ ...buttonLoadingSignal(), signed: true });
               expect(service.signTransactionButtonLabel()).toBe('Signing...');
          });
     });

     describe('submitTransactionButtonLabel', () => {
          it('should return default label when idle and not loading', () => {
               currentStepSignal.set('idle');
               buttonLoadingSignal.set({ ...buttonLoadingSignal(), submit: false });
               expect(service.submitTransactionButtonLabel()).toBe('Submit Transaction');
          });
     });

     describe('signMultiSignButtonLabel', () => {
          it('should return default label when idle and not loading', () => {
               currentStepSignal.set('idle');
               buttonLoadingSignal.set({ ...buttonLoadingSignal(), multiSign: false });
               expect(service.signMultiSignButtonLabel()).toBe('Sign for Multi-Sign');
          });
     });

     describe('signWithRegularKeyButtonLabel', () => {
          it('should return default label when idle and not loading', () => {
               currentStepSignal.set('idle');
               buttonLoadingSignal.set({ ...buttonLoadingSignal(), regularKeySign: false });
               expect(service.signWithRegularKeyButtonLabel()).toBe('Sign with Regular Key');
          });
     });

     describe('onTxJsonChange', () => {
          it('should set txJson and clear error for valid JSON', () => {
               const validJson = '{"test": "value"}';
               service.onTxJsonChange(validJson);
               expect(mockSignTransationStoreService.setField).toHaveBeenCalledWith('txJson', validJson);
               expect(mockSignTransationStoreService.setField).toHaveBeenCalledWith('jsonEditorError', '');
          });

          it('should set error for invalid JSON', () => {
               const invalidJson = '{invalid json}';
               service.onTxJsonChange(invalidJson);
               expect(mockSignTransationStoreService.setField).toHaveBeenCalledWith('txJson', invalidJson);
               expect(mockSignTransationStoreService.setField).toHaveBeenCalledWith('jsonEditorError', 'Invalid JSON');
          });
     });

     describe('setTxJson', () => {
          it('should set txJson field', () => {
               const json = '{"test": "value"}';
               service.setTxJson(json);
               expect(mockSignTransationStoreService.setField).toHaveBeenCalledWith('txJson', json);
          });
     });

     describe('setSigned', () => {
          it('should set outputField', () => {
               const blob = 'signed_blob';
               service.setSigned(blob);
               expect(mockSignTransationStoreService.setField).toHaveBeenCalledWith('outputField', blob);
          });
     });

     describe('createBatchpRequestText', () => {
          it('should create batch request text', async () => {
               const options = {
                    client: {} as any,
                    wallet: { classicAddress: 'rAddress' } as any,
                    accountInfo: { result: { account_data: { Sequence: 1 } } } as any,
                    fee: '12',
                    currentLedger: 1000,
               };
               const result = await service.createBatchpRequestText(options);
               expect(result).toContain('Batch');
               expect(result).toContain('rAddress');
          });
     });

     describe('buildTransactionText', () => {
          const mockOptions = {
               client: {} as any,
               wallet: { classicAddress: 'rAddress' } as any,
               accountInfo: { result: { account_data: { Sequence: 1 } } } as any,
               currentLedger: 1000,
               fee: '12',
               selectedTransaction: 'sendXrp' as const,
          };

          it('should build transaction text for sendXrp', async () => {
               const result = await service.buildTransactionText(mockOptions);
               expect(result).toContain('Payment');
               expect(result).toContain('rAddress');
          });

          it('should throw error for unsupported transaction type', async () => {
               const invalidOptions = { ...mockOptions, selectedTransaction: 'invalid' as any };
               try {
                    await service.buildTransactionText(invalidOptions);
                    fail('Expected error to be thrown');
               } catch (error: any) {
                    expect(error.message).toBe('Unsupported transaction type: invalid');
               }
          });

          it('should apply ticket when enabled', async () => {
               mockXrplService.checkTicketExists.and.resolveTo(true);
               const ticketOptions = {
                    ...mockOptions,
                    isTicketEnabled: true,
                    ticketSequence: '12345',
               };
               await service.buildTransactionText(ticketOptions);
               expect(mockUtilsService.setTicketSequence).toHaveBeenCalled();
          });

          it('should throw error when ticket not found', async () => {
               mockXrplService.checkTicketExists.and.resolveTo(false);
               const ticketOptions = {
                    ...mockOptions,
                    isTicketEnabled: true,
                    ticketSequence: '12345',
               };
               try {
                    await service.buildTransactionText(ticketOptions);
                    fail('Expected error to be thrown');
               } catch (error: any) {
                    expect(error.message).toBe('Ticket 12345 not found');
               }
          });
     });
});
