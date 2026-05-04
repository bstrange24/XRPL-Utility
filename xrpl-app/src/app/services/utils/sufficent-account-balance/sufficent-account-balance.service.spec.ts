import { TestBed } from '@angular/core/testing';
import { SufficentAccountBalanceService } from './sufficent-account-balance.service';
import { UtilsService } from '../util-service/utils.service';
import { AppConstants } from '../../../core/app.constants';

// Mock UtilsService
class MockUtilsService {
     isInsufficientXrpBalance1 = jasmine.createSpy();
     isInsufficientIouTrustlineBalance = jasmine.createSpy();
}

describe('SufficentAccountBalanceService', () => {
     let service: SufficentAccountBalanceService;
     let utilsService: MockUtilsService;
     let mockEnv: any;
     let mockTx: any;

     beforeEach(() => {
          utilsService = new MockUtilsService();

          TestBed.configureTestingModule({
               providers: [SufficentAccountBalanceService, { provide: UtilsService, useValue: utilsService }],
          });

          service = TestBed.inject(SufficentAccountBalanceService);

          mockEnv = {
               serverInfo: { result: { info: { validated_ledger: { reserve_base_xrp: 10, reserve_inc_xrp: 0.2 } } } },
               accountInfo: { result: { account_data: { Balance: '1000000', OwnerCount: 0 } } },
               wallet: { classicAddress: 'rTestAddress' },
               fee: '12',
               accountLines: { result: { lines: [] } },
               trustlines: { result: { lines: [] } },
               destination: 'rDestinationAddress',
          };

          mockTx = {
               TransactionType: 'Payment',
               Amount: '1000000',
          };
     });

     describe('checkXrpBalance', () => {
          it('should return success true when XRP balance is sufficient', async () => {
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);

               const result = await service.checkXrpBalance(mockEnv, mockTx, '10');

               expect(result.success).toBe(true);
               expect(result.error).toBe('');
               expect(utilsService.isInsufficientXrpBalance1).toHaveBeenCalledWith(mockEnv.serverInfo, mockEnv.accountInfo, '10', mockEnv.wallet.classicAddress, mockTx, mockEnv.fee);
          });

          it('should return success false when XRP balance is insufficient', async () => {
               utilsService.isInsufficientXrpBalance1.and.returnValue(true);

               const result = await service.checkXrpBalance(mockEnv, mockTx, '10');

               expect(result.success).toBe(false);
               expect(result.error).toBe(AppConstants.INSUFFICIENT_XRP_BALANCE);
          });

          it('should handle zero amount', async () => {
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);

               const result = await service.checkXrpBalance(mockEnv, mockTx, '0');

               expect(result.success).toBe(true);
               expect(utilsService.isInsufficientXrpBalance1).toHaveBeenCalledWith(mockEnv.serverInfo, mockEnv.accountInfo, '0', mockEnv.wallet.classicAddress, mockTx, mockEnv.fee);
          });

          it('should handle large amount values', async () => {
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);

               const result = await service.checkXrpBalance(mockEnv, mockTx, '999999999');

               expect(result.success).toBe(true);
          });

          it('should handle undefined fee in env', async () => {
               mockEnv.fee = undefined;
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);

               const result = await service.checkXrpBalance(mockEnv, mockTx, '10');

               expect(result.success).toBe(true);
               expect(utilsService.isInsufficientXrpBalance1).toHaveBeenCalledWith(mockEnv.serverInfo, mockEnv.accountInfo, '10', mockEnv.wallet.classicAddress, mockTx, undefined);
          });

          it('should handle missing wallet classicAddress', async () => {
               mockEnv.wallet.classicAddress = undefined;
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);

               const result = await service.checkXrpBalance(mockEnv, mockTx, '10');

               expect(result.success).toBe(true);
          });

          it('should handle different transaction types', async () => {
               const offerTx = { TransactionType: 'OfferCreate', TakerGets: '1000000' };
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);

               const result = await service.checkXrpBalance(mockEnv, offerTx, '10');

               expect(result.success).toBe(true);
          });
     });

     describe('checkTokenBalance', () => {
          beforeEach(() => {
               mockTx = {
                    TransactionType: 'Payment',
                    Amount: {
                         currency: 'USD',
                         issuer: 'rIssuer',
                         value: '100',
                    },
               };
          });

          it('should return success true when token balance is sufficient (using accountLines)', async () => {
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(true);
               expect(result.error).toBe('');
               expect(utilsService.isInsufficientIouTrustlineBalance).toHaveBeenCalledWith(mockEnv.accountLines, mockTx, mockEnv.destination);
          });

          it('should return success true when token balance is sufficient (using trustlines fallback)', async () => {
               const envWithoutAccountLines = { ...mockEnv, accountLines: undefined };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(envWithoutAccountLines, mockTx);

               expect(result.success).toBe(true);
               expect(utilsService.isInsufficientIouTrustlineBalance).toHaveBeenCalledWith(envWithoutAccountLines.trustlines, mockTx, mockEnv.destination);
          });

          it('should return success false when token balance is insufficient', async () => {
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(true);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(false);
               expect(result.error).toBe(AppConstants.INSUFFICIENT_IOU_BALANCE);
          });

          it('should handle XRP transaction (not a token)', async () => {
               const xrpTx = { TransactionType: 'Payment', Amount: '1000000' };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, xrpTx);

               expect(result.success).toBe(true);
          });

          it('should handle different token currencies', async () => {
               mockTx.Amount = {
                    currency: 'EUR',
                    issuer: 'rEuroIssuer',
                    value: '50',
               };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(true);
          });

          it('should handle zero token amount', async () => {
               mockTx.Amount = {
                    currency: 'USD',
                    issuer: 'rIssuer',
                    value: '0',
               };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(true);
          });

          it('should handle large token amounts', async () => {
               mockTx.Amount = {
                    currency: 'USD',
                    issuer: 'rIssuer',
                    value: '999999999.999999',
               };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(true);
          });

          it('should handle missing destination in env', async () => {
               mockEnv.destination = undefined;
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(true);
               expect(utilsService.isInsufficientIouTrustlineBalance).toHaveBeenCalledWith(mockEnv.accountLines, mockTx, undefined);
          });

          it('should handle empty accountLines', async () => {
               mockEnv.accountLines = { result: { lines: [] } };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(true);
          });

          it('should handle null accountLines and trustlines', async () => {
               const envWithNullLines = {
                    ...mockEnv,
                    accountLines: null,
                    trustlines: null,
               };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(envWithNullLines, mockTx);

               expect(result.success).toBe(true);
          });
     });

     describe('Edge Cases and Error Handling', () => {
          it('should handle both XRP and token checks in sequence', async () => {
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const xrpResult = await service.checkXrpBalance(mockEnv, mockTx, '10');
               const tokenResult = await service.checkTokenBalance(mockEnv, mockTx);

               expect(xrpResult.success).toBe(true);
               expect(tokenResult.success).toBe(true);
          });

          it('should handle XRP check failure followed by token check', async () => {
               utilsService.isInsufficientXrpBalance1.and.returnValue(true);
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const xrpResult = await service.checkXrpBalance(mockEnv, mockTx, '10');
               const tokenResult = await service.checkTokenBalance(mockEnv, mockTx);

               expect(xrpResult.success).toBe(false);
               expect(xrpResult.error).toBe(AppConstants.INSUFFICIENT_XRP_BALANCE);
               expect(tokenResult.success).toBe(true);
          });

          it('should handle token check failure followed by XRP check', async () => {
               utilsService.isInsufficientXrpBalance1.and.returnValue(false);
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(true);

               const xrpResult = await service.checkXrpBalance(mockEnv, mockTx, '10');
               const tokenResult = await service.checkTokenBalance(mockEnv, mockTx);

               expect(xrpResult.success).toBe(true);
               expect(tokenResult.success).toBe(false);
               expect(tokenResult.error).toBe(AppConstants.INSUFFICIENT_IOU_BALANCE);
          });

          it('should handle transaction with SendMax instead of Amount', async () => {
               const sendMaxTx = {
                    TransactionType: 'Payment',
                    SendMax: {
                         currency: 'USD',
                         issuer: 'rIssuer',
                         value: '100',
                    },
               };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, sendMaxTx);

               expect(result.success).toBe(true);
          });

          it('should handle malformed token amount', async () => {
               mockTx.Amount = {
                    currency: 'USD',
                    issuer: 'rIssuer',
                    // missing value
               };
               utilsService.isInsufficientIouTrustlineBalance.and.returnValue(false);

               const result = await service.checkTokenBalance(mockEnv, mockTx);

               expect(result.success).toBe(true);
          });
     });
});
