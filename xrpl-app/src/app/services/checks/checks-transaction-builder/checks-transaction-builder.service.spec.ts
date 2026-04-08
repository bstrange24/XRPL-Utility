import { TestBed } from '@angular/core/testing';
import { ChecksTransactionBuilderService } from './checks-transaction-builder.service';
import { UtilsService } from '../../utils/util-service/utils.service';
import { XrplTransactionService } from '../../xrpl-transactions/xrpl-transaction.service';
import { TrustlineUtilService } from '../../trustlines/trustline-utils/trustline-util.service';

describe('ChecksTransactionBuilderService', () => {
     let service: ChecksTransactionBuilderService;
     let utilsSpy: jasmine.SpyObj<any>;
     let xrplTxSpy: jasmine.SpyObj<any>;

     const mockWallet: any = { classicAddress: 'rSOURCE' };

     const baseEnv: any = {
          fee: '12',
          ledgerInfo: { lastIndex: 5000, currentRippleTime: 100 },
     };

     const xrpCurrency: any = { currency: 'XRP', currencyCode: 'XRP', currencyIssuer: '' };
     const iouCurrency: any = { currency: 'USD', currencyCode: 'USD', currencyIssuer: 'rISSUER' };

     beforeEach(() => {
          utilsSpy = {
               toRippleTime: jasmine.createSpy('toRippleTime').and.returnValue(200),
               setExpiration: jasmine.createSpy('setExpiration'),
               encodeIfNeeded: jasmine.createSpy('encodeIfNeeded').and.callFake((v: string) => v),
          };
          xrplTxSpy = {
               buildSendMaxAmount: jasmine.createSpy('buildSendMaxAmount').and.returnValue({ sendMax: '1000000' }),
          };

          TestBed.configureTestingModule({
               providers: [
                    ChecksTransactionBuilderService,
                    { provide: UtilsService, useValue: utilsSpy },
                    { provide: XrplTransactionService, useValue: xrplTxSpy },
                    { provide: TrustlineUtilService, useValue: {} },
               ],
          });
          service = TestBed.inject(ChecksTransactionBuilderService);
     });

     it('should be created', () => {
          expect(service).toBeTruthy();
     });

     describe('buildCreateCheckTx', () => {
          it('should build XRP CheckCreate transaction', () => {
               const check: any = { amount: '10', destination: 'rDEST', enableExpirationDate: false };
               const tx = service.buildCreateCheckTx(mockWallet, baseEnv, check, xrpCurrency);
               expect(tx.TransactionType).toBe('CheckCreate');
               expect(tx.Account).toBe('rSOURCE');
               expect(tx.Destination).toBe('rDEST');
               expect(xrplTxSpy.buildSendMaxAmount).toHaveBeenCalledWith('XRP', '', '10', false);
          });

          it('should build IOU CheckCreate transaction', () => {
               const check: any = { amount: '50', destination: 'rDEST', enableExpirationDate: false };
               const tx = service.buildCreateCheckTx(mockWallet, baseEnv, check, iouCurrency);
               expect(tx.TransactionType).toBe('CheckCreate');
               expect(xrplTxSpy.buildSendMaxAmount).toHaveBeenCalledWith('USD', 'rISSUER', '50', false);
          });

          it('should add Expiration when enableExpirationDate is true and date is in the future', () => {
               utilsSpy.toRippleTime.and.returnValue(500); // > currentRippleTime 100
               const check: any = { amount: '10', destination: 'rDEST', enableExpirationDate: true, checkExpirationDate: '2030-01-01T00:00' };
               service.buildCreateCheckTx(mockWallet, baseEnv, check, xrpCurrency);
               expect(utilsSpy.setExpiration).toHaveBeenCalledWith(jasmine.any(Object), 500);
          });

          it('should throw when expiration is in the past', () => {
               utilsSpy.toRippleTime.and.returnValue(50); // <= currentRippleTime 100
               const check: any = { amount: '10', destination: 'rDEST', enableExpirationDate: true, checkExpirationDate: '2000-01-01T00:00' };
               expect(() => service.buildCreateCheckTx(mockWallet, baseEnv, check, xrpCurrency))
                    .toThrowError('Check expiration time must be in the future');
          });

          it('should not set Expiration when enableExpirationDate is false', () => {
               const check: any = { amount: '10', destination: 'rDEST', enableExpirationDate: false, checkExpirationDate: '2030-01-01' };
               service.buildCreateCheckTx(mockWallet, baseEnv, check, xrpCurrency);
               expect(utilsSpy.setExpiration).not.toHaveBeenCalled();
          });
     });

     describe('buildCashCheckTx', () => {
          it('should set Amount (not DeliverMin) when useDeliverMin is false', () => {
               const check: any = { amount: '5', checkIdField: 'CHECKID123', useDeliverMin: false };
               const tx = service.buildCashCheckTx(mockWallet, baseEnv, check, xrpCurrency, null);
               expect(tx.TransactionType).toBe('CheckCash');
               expect((tx as any).Amount).toBe('1000000');
               expect((tx as any).DeliverMin).toBeUndefined();
               expect(tx.CheckID).toBe('CHECKID123');
          });

          it('should set DeliverMin (not Amount) when useDeliverMin is true', () => {
               const check: any = { amount: '5', checkIdField: 'CHECKID456', useDeliverMin: true };
               const tx = service.buildCashCheckTx(mockWallet, baseEnv, check, xrpCurrency, null);
               expect((tx as any).DeliverMin).toBe('1000000');
               expect((tx as any).Amount).toBeUndefined();
          });

          it('should build IOU CheckCash transaction', () => {
               const check: any = { amount: '100', checkIdField: 'IOUCHECKID', useDeliverMin: false };
               const tx = service.buildCashCheckTx(mockWallet, baseEnv, check, iouCurrency, null);
               expect(tx.TransactionType).toBe('CheckCash');
               expect(xrplTxSpy.buildSendMaxAmount).toHaveBeenCalledWith('USD', 'rISSUER', '100', false);
          });
     });

     describe('buildCancelCheckTx', () => {
          it('should build CheckCancel transaction', () => {
               const check: any = { checkIdField: 'CANCELID789' };
               const tx = service.buildCancelCheckTx(mockWallet, baseEnv, check);
               expect(tx.TransactionType).toBe('CheckCancel');
               expect(tx.Account).toBe('rSOURCE');
               expect(tx.CheckID).toBe('CANCELID789');
               expect(tx.Fee).toBe('12');
          });
     });
});
