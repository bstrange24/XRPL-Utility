import { TestBed } from '@angular/core/testing';
import { EscrowTransactionBuilderService } from './escrow-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';

describe('EscrowTransactionBuilderService', () => {
     let service: EscrowTransactionBuilderService;
     let utilsSpy: any;
     let xrplTxSpy: any;

     const mockWallet: any = { address: 'rTEST', classicAddress: 'rTEST' };
     const mockEnv: any = {
          fee: '12',
          ledgerInfo: { lastIndex: 5000, currentRippleTime: 100 },
     };

     beforeEach(() => {
          utilsSpy = {
               toRippleTime: jasmine.createSpy('toRippleTime').and.returnValue(500),
               setFinishAfter: jasmine.createSpy('setFinishAfter'),
               setCancelAfter: jasmine.createSpy('setCancelAfter'),
               encodeIfNeeded: jasmine.createSpy('encodeIfNeeded').and.callFake((v: string) => v),
          };

          xrplTxSpy = {
               buildSendMaxAmount: jasmine.createSpy('buildSendMaxAmount').and.returnValue({ sendMax: '1000000' }),
               buildAmount: jasmine.createSpy('buildAmount').and.returnValue({ amountToCash: { currency: 'USD', value: '10', issuer: 'rISSUER' } }),
          };

          TestBed.configureTestingModule({
               providers: [EscrowTransactionBuilderService, { provide: UtilsService, useValue: utilsSpy }, { provide: XrplTransactionService, useValue: xrplTxSpy }, { provide: TrustlineUtilService, useValue: {} }],
          });
          service = TestBed.inject(EscrowTransactionBuilderService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('buildCreateEscrowTx', () => {
          it('should build XRP escrow transaction', () => {
               const escrow = { amount: '10', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: false, enableEscrowCancelAfterExpirationDate: false, escrowFinishAfterExpirationDate: '', escrowCancelAfterExpirationDate: '' };
               const currency = { currency: 'XRP', currencyCode: 'XRP', issuer: '' };
               const tx = service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency);
               expect(tx.TransactionType).toBe('EscrowCreate');
               expect(xrplTxSpy.buildSendMaxAmount).toHaveBeenCalledWith('XRP', '', '10', false);
          });

          it('should build MPT escrow transaction', () => {
               const escrow = { amount: '5', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: false, enableEscrowCancelAfterExpirationDate: false, escrowFinishAfterExpirationDate: '', escrowCancelAfterExpirationDate: '' };
               const currency = { currency: 'MPT', currencyCode: 'MPT', issuer: 'rISSUER' };
               const tx = service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency);
               expect(tx.TransactionType).toBe('EscrowCreate');
               expect(xrplTxSpy.buildSendMaxAmount).toHaveBeenCalledWith('MPT', 'rISSUER', '5', true);
          });

          it('should build IOU escrow transaction', () => {
               const escrow = { amount: '10', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: false, enableEscrowCancelAfterExpirationDate: false, escrowFinishAfterExpirationDate: '', escrowCancelAfterExpirationDate: '' };
               const currency = { currency: 'USD', currencyCode: 'USD', issuer: 'rISSUER' };
               const tx = service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency);
               expect(tx.TransactionType).toBe('EscrowCreate');
               expect(xrplTxSpy.buildAmount).toHaveBeenCalledWith('USD', '10', 'rISSUER');
          });

          it('should set Condition when condition is provided', () => {
               const escrow = { amount: '10', destination: 'rDEST', condition: 'ABCDEF1234', enableEscrowFinishAfterExpirationDate: false, enableEscrowCancelAfterExpirationDate: false, escrowFinishAfterExpirationDate: '', escrowCancelAfterExpirationDate: '' };
               const currency = { currency: 'XRP', currencyCode: 'XRP', issuer: '' };
               const tx = service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency);
               expect((tx as any).Condition).toBe('ABCDEF1234');
          });

          it('should call setFinishAfter when enableEscrowFinishAfterExpirationDate and date are set', () => {
               utilsSpy.toRippleTime.and.returnValue(500);
               const escrow = { amount: '10', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: true, enableEscrowCancelAfterExpirationDate: false, escrowFinishAfterExpirationDate: '2030-01-01T00:00', escrowCancelAfterExpirationDate: '' };
               const currency = { currency: 'XRP', currencyCode: 'XRP', issuer: '' };
               service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency);
               expect(utilsSpy.setFinishAfter).toHaveBeenCalledWith(jasmine.any(Object), 500);
          });

          it('should throw when finishAfter rippleTime is in the past', () => {
               utilsSpy.toRippleTime.and.returnValue(50); // less than currentRippleTime=100
               const escrow = { amount: '10', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: true, enableEscrowCancelAfterExpirationDate: false, escrowFinishAfterExpirationDate: '2000-01-01T00:00', escrowCancelAfterExpirationDate: '' };
               const currency = { currency: 'XRP', currencyCode: 'XRP', issuer: '' };
               expect(() => service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency)).toThrowError('Escrow finish time must be in the future');
          });

          it('should call setCancelAfter when enableEscrowCancelAfterExpirationDate and date are set', () => {
               utilsSpy.toRippleTime.and.returnValue(500);
               const escrow = { amount: '10', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: false, enableEscrowCancelAfterExpirationDate: true, escrowFinishAfterExpirationDate: '', escrowCancelAfterExpirationDate: '2030-06-01T00:00' };
               const currency = { currency: 'XRP', currencyCode: 'XRP', issuer: '' };
               service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency);
               expect(utilsSpy.setCancelAfter).toHaveBeenCalledWith(jasmine.any(Object), 500);
          });

          it('should throw when cancelAfter rippleTime is in the past', () => {
               utilsSpy.toRippleTime.and.returnValue(50); // less than currentRippleTime=100
               const escrow = { amount: '10', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: false, enableEscrowCancelAfterExpirationDate: true, escrowFinishAfterExpirationDate: '', escrowCancelAfterExpirationDate: '2000-01-01T00:00' };
               const currency = { currency: 'XRP', currencyCode: 'XRP', issuer: '' };
               expect(() => service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency)).toThrowError('Escrow cancel time must be in the future');
          });

          it('should not call setFinishAfter or setCancelAfter when toggles are off', () => {
               const escrow = { amount: '10', destination: 'rDEST', condition: '', enableEscrowFinishAfterExpirationDate: false, enableEscrowCancelAfterExpirationDate: false, escrowFinishAfterExpirationDate: '2030-01-01', escrowCancelAfterExpirationDate: '2030-06-01' };
               const currency = { currency: 'XRP', currencyCode: 'XRP', issuer: '' };
               service.buildCreateEscrowTx(mockWallet, mockEnv, escrow, currency);
               expect(utilsSpy.setFinishAfter).not.toHaveBeenCalled();
               expect(utilsSpy.setCancelAfter).not.toHaveBeenCalled();
          });
     });

     describe('buildFinishEscrowTx', () => {
          it('should build basic EscrowFinish transaction', () => {
               const escrow = { escrowOwner: 'rOWNER', escrowSequenceNumber: 42, fulfillment: '', condition: '' };
               const tx = service.buildFinishEscrowTx(mockWallet, mockEnv, escrow);
               expect(tx.TransactionType).toBe('EscrowFinish');
               expect(tx.Owner).toBe('rOWNER');
               expect(tx.OfferSequence).toBe(42);
          });

          it('should set Fulfillment and Condition when provided', () => {
               const escrow = { escrowOwner: 'rOWNER', escrowSequenceNumber: 5, fulfillment: 'FFFF', condition: 'CCCC' };
               const tx = service.buildFinishEscrowTx(mockWallet, mockEnv, escrow);
               expect((tx as any).Fulfillment).toBe('FFFF');
               expect((tx as any).Condition).toBe('CCCC');
          });

          it('should adjust Fee when both fulfillment and condition are present', () => {
               const fulfillment = 'A'.repeat(32); // 32 chars = 16 bytes
               const escrow = { escrowOwner: 'rOWNER', escrowSequenceNumber: 5, fulfillment, condition: 'CCCC' };
               const tx = service.buildFinishEscrowTx(mockWallet, mockEnv, escrow);
               const baseFee = Number(mockEnv.fee);
               const expectedFee = baseFee * (33 + Math.ceil(fulfillment.length / 2 / 16));
               expect(tx.Fee).toBe(expectedFee.toString());
          });
     });

     describe('buildCancelEscrowTx', () => {
          it('should build EscrowCancel transaction', () => {
               const escrow = { escrowOwner: 'rOWNER', escrowSequenceNumber: 99 };
               const tx = service.buildCancelEscrowTx(mockWallet, mockEnv, escrow);
               expect(tx.TransactionType).toBe('EscrowCancel');
               expect(tx.Owner).toBe('rOWNER');
               expect(tx.OfferSequence).toBe(99);
          });
     });
});
