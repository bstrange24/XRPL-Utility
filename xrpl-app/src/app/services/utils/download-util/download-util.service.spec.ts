import { TestBed } from '@angular/core/testing';
import { DownloadUtilService } from './download-util.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';

// Mock TransactionUiService with proper typing
class MockTransactionUiService {
     txResultSignal = jasmine.createSpy().and.returnValue({ success: true, hash: 'tx123' });
     txResult: any = { success: true, hash: 'tx456' };
     txSignal = jasmine.createSpy().and.returnValue({ transaction: 'payment', amount: '100' });
}

describe('DownloadUtilService', () => {
     let service: DownloadUtilService;
     let uiService: MockTransactionUiService;
     let mockAnchor: HTMLAnchorElement;
     let mockUrl: string;

     beforeEach(() => {
          uiService = new MockTransactionUiService();

          TestBed.configureTestingModule({
               providers: [DownloadUtilService, { provide: TransactionUiService, useValue: uiService as any }],
          });

          service = TestBed.inject(DownloadUtilService);

          // Mock URL.createObjectURL and URL.revokeObjectURL
          mockUrl = 'blob:http://localhost/test';
          spyOn(URL, 'createObjectURL').and.returnValue(mockUrl);
          spyOn(URL, 'revokeObjectURL');

          // Mock document.createElement and anchor element methods
          mockAnchor = {
               href: '',
               download: '',
               click: jasmine.createSpy(),
          } as any;
          spyOn(document, 'createElement').and.returnValue(mockAnchor);
     });

     afterEach(() => {
          // Clean up
          (URL.createObjectURL as jasmine.Spy).calls.reset();
          (URL.revokeObjectURL as jasmine.Spy).calls.reset();
          (document.createElement as jasmine.Spy).calls.reset();
          if (mockAnchor.click) (mockAnchor.click as jasmine.Spy).calls.reset();
     });

     describe('downloadSignTxJson', () => {
          it('should create a blob from JSON and trigger download', () => {
               const txJson = { transaction: 'test', amount: 100 };

               service.downloadSignTxJson(txJson);

               // Verify Blob was created with correct content
               expect(URL.createObjectURL).toHaveBeenCalled();
               const blobArg = (URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0];
               expect(blobArg).toBeInstanceOf(Blob);

               // Verify anchor element was configured correctly
               expect(mockAnchor.href).toBe(mockUrl);
               expect(mockAnchor.download).toMatch(/^tx-result-\d+\.json$/);
               expect(mockAnchor.click).toHaveBeenCalled();

               // Verify URL was revoked
               expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
          });

          it('should handle string input', () => {
               const jsonString = '{"test": "value"}';

               service.downloadSignTxJson(jsonString);

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
               expect(URL.revokeObjectURL).toHaveBeenCalled();
          });

          it('should handle null input', () => {
               service.downloadSignTxJson(null);

               expect(URL.createObjectURL).toHaveBeenCalled();
               const blobArg = (URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0];
               expect(blobArg).toBeInstanceOf(Blob);
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle undefined input', () => {
               service.downloadSignTxJson(undefined);

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle array input', () => {
               const txArray = [{ tx1: 'value1' }, { tx2: 'value2' }];

               service.downloadSignTxJson(txArray);

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });
     });

     describe('downloadTxResultSignal', () => {
          it('should download the txResultSignal as JSON', () => {
               const mockResult = { success: true, hash: 'tx123' };
               uiService.txResultSignal.and.returnValue(mockResult);

               service.downloadTxResultSignal();

               expect(uiService.txResultSignal).toHaveBeenCalled();

               // Verify Blob was created with correct content
               expect(URL.createObjectURL).toHaveBeenCalled();
               const blobArg = (URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0];
               expect(blobArg).toBeInstanceOf(Blob);

               // Verify anchor configuration
               expect(mockAnchor.download).toMatch(/^tx-result-\d+\.json$/);
               expect(mockAnchor.click).toHaveBeenCalled();
               expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
          });

          it('should handle empty signal result', () => {
               uiService.txResultSignal.and.returnValue(null);

               service.downloadTxResultSignal();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle complex signal result', () => {
               const complexResult = {
                    transaction: {
                         hash: 'tx123',
                         type: 'Payment',
                         amount: 1000,
                         timestamp: Date.now(),
                    },
                    metadata: {
                         fee: 12,
                         sequence: 1,
                    },
               };
               uiService.txResultSignal.and.returnValue(complexResult);

               service.downloadTxResultSignal();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });
     });

     describe('downloadTxResult', () => {
          it('should download the txResult as JSON', () => {
               const mockResult = { success: true, hash: 'tx456' };
               uiService.txResult = mockResult;

               service.downloadTxResult();

               expect(URL.createObjectURL).toHaveBeenCalled();
               const blobArg = (URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0];
               expect(blobArg).toBeInstanceOf(Blob);
               expect(mockAnchor.download).toMatch(/^tx-result-\d+\.json$/);
               expect(mockAnchor.click).toHaveBeenCalled();
               expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
          });

          it('should handle undefined txResult', () => {
               uiService.txResult = undefined;

               service.downloadTxResult();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle null txResult', () => {
               uiService.txResult = null;

               service.downloadTxResult();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle nested objects in txResult', () => {
               const nestedResult = {
                    level1: {
                         level2: {
                              level3: 'deep value',
                         },
                         array: [1, 2, 3],
                    },
               };
               uiService.txResult = nestedResult;

               service.downloadTxResult();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });
     });

     describe('downloadTxSignal', () => {
          it('should download the txSignal as JSON', () => {
               const mockSignal = { transaction: 'payment', amount: '100' };
               uiService.txSignal.and.returnValue(mockSignal);

               service.downloadTxSignal();

               expect(uiService.txSignal).toHaveBeenCalled();
               expect(URL.createObjectURL).toHaveBeenCalled();
               const blobArg = (URL.createObjectURL as jasmine.Spy).calls.mostRecent().args[0];
               expect(blobArg).toBeInstanceOf(Blob);
               expect(mockAnchor.download).toMatch(/^payment-tx-\d+\.json$/);
               expect(mockAnchor.click).toHaveBeenCalled();
               expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
          });

          it('should handle empty txSignal', () => {
               uiService.txSignal.and.returnValue(null);

               service.downloadTxSignal();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle txSignal with array data', () => {
               const arraySignal = [
                    { transaction: 'payment1', amount: 100 },
                    { transaction: 'payment2', amount: 200 },
               ];
               uiService.txSignal.and.returnValue(arraySignal);

               service.downloadTxSignal();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle txSignal with special characters', () => {
               const specialSignal = {
                    description: 'Payment with special chars: !@#$%^&*()',
                    amount: '100.00',
               };
               uiService.txSignal.and.returnValue(specialSignal);

               service.downloadTxSignal();

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });
     });

     describe('Edge cases and error handling', () => {
          it('should handle circular references without throwing', () => {
               const circular: any = { name: 'circular' };
               circular.self = circular;

               // This should not throw
               expect(() => {
                    service.downloadSignTxJson(circular);
               }).not.toThrow();

               // Verify the download was attempted
               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should create unique filenames with timestamps', () => {
               service.downloadSignTxJson({ test: 1 });
               service.downloadSignTxJson({ test: 2 });

               // Both calls should have happened
               expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
               expect(mockAnchor.click).toHaveBeenCalledTimes(2);
          });

          it('should handle very large JSON objects', () => {
               const largeObject: any = {};
               for (let i = 0; i < 1000; i++) {
                    largeObject[`key${i}`] = `value${i}`;
               }

               service.downloadSignTxJson(largeObject);

               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });

          it('should handle numbers and primitive values', () => {
               service.downloadSignTxJson(12345);
               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();

               (URL.createObjectURL as jasmine.Spy).calls.reset();
               (mockAnchor.click as jasmine.Spy).calls.reset();

               service.downloadSignTxJson(true);
               expect(URL.createObjectURL).toHaveBeenCalled();
               expect(mockAnchor.click).toHaveBeenCalled();
          });
     });

     describe('Integration with TransactionUiService', () => {
          it('should use the injected TransactionUiService', () => {
               // Since we're using mock, we just verify the service exists
               expect(service).toBeTruthy();
               expect(service.ui).toBeDefined();
          });

          it('should access txResultSignal from the service', () => {
               service.downloadTxResultSignal();
               expect(uiService.txResultSignal).toHaveBeenCalled();
          });

          it('should access txResult from the service', () => {
               service.downloadTxResult();
               expect(URL.createObjectURL).toHaveBeenCalled();
          });

          it('should access txSignal from the service', () => {
               service.downloadTxSignal();
               expect(uiService.txSignal).toHaveBeenCalled();
          });
     });
});
