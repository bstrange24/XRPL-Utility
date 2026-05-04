import { TestBed } from '@angular/core/testing';
import { LogServiceService } from './log-service.service';
import * as xrpl from 'xrpl';

describe('LogServiceService', () => {
     let service: LogServiceService;
     let consoleDebugSpy: jasmine.Spy;

     beforeEach(() => {
          // Spy on console.debug
          consoleDebugSpy = spyOn(console, 'debug');

          TestBed.configureTestingModule({
               providers: [LogServiceService],
          });

          service = TestBed.inject(LogServiceService);
     });

     afterEach(() => {
          consoleDebugSpy.calls.reset();
     });

     describe('logLedgerObjects', () => {
          it('should log fee, currentLedger, and serverInfo', () => {
               const fee = '12';
               const currentLedger = 123456;
               const serverInfo = { result: { info: { validated_ledger: { seq: 123456 } } } } as xrpl.ServerInfoResponse;

               service.logLedgerObjects(fee, currentLedger, serverInfo);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(3);
               expect(consoleDebugSpy).toHaveBeenCalledWith('fee:', fee);
               expect(consoleDebugSpy).toHaveBeenCalledWith('currentLedger:', currentLedger);
               expect(consoleDebugSpy).toHaveBeenCalledWith('serverInfo:', serverInfo);
          });

          it('should handle empty fee', () => {
               const fee = '';
               const currentLedger = 0;
               const serverInfo = {} as xrpl.ServerInfoResponse;

               service.logLedgerObjects(fee, currentLedger, serverInfo);

               expect(consoleDebugSpy).toHaveBeenCalledWith('fee:', fee);
               expect(consoleDebugSpy).toHaveBeenCalledWith('currentLedger:', currentLedger);
               expect(consoleDebugSpy).toHaveBeenCalledWith('serverInfo:', serverInfo);
          });

          it('should handle null serverInfo', () => {
               const fee = '12';
               const currentLedger = 123;
               const serverInfo = null as any;

               service.logLedgerObjects(fee, currentLedger, serverInfo);

               expect(consoleDebugSpy).toHaveBeenCalledWith('serverInfo:', serverInfo);
          });
     });

     describe('logAccountInfoObjects', () => {
          it('should log accountInfo and accountObject when both provided', () => {
               const accountInfo = { result: { account_data: { Account: 'rTest' } } };
               const accountObject = { result: { account_objects: [] } };

               service.logAccountInfoObjects(accountInfo, accountObject);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(2);
               expect(consoleDebugSpy).toHaveBeenCalledWith('accountInfo:', accountInfo.result);
               expect(consoleDebugSpy).toHaveBeenCalledWith('accountObject:', accountObject.result);
          });

          it('should log only accountInfo when accountObject is null', () => {
               const accountInfo = { result: { account_data: { Account: 'rTest' } } };
               const accountObject = null;

               service.logAccountInfoObjects(accountInfo, accountObject);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('accountInfo:', accountInfo.result);
          });

          it('should log only accountObject when accountInfo is null', () => {
               const accountInfo = null;
               const accountObject = { result: { account_objects: [] } };

               service.logAccountInfoObjects(accountInfo, accountObject);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('accountObject:', accountObject.result);
          });

          it('should log nothing when both are null', () => {
               service.logAccountInfoObjects(null, null);

               expect(consoleDebugSpy).not.toHaveBeenCalled();
          });

          it('should handle undefined values', () => {
               const accountInfo = { result: { account_data: { Account: 'rTest' } } };
               const accountObject = undefined;

               service.logAccountInfoObjects(accountInfo, accountObject);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('accountInfo:', accountInfo.result);
          });

          it('should handle accountInfo without result property', () => {
               const accountInfo = { someData: 'value' };
               const accountObject = null;

               service.logAccountInfoObjects(accountInfo, accountObject);

               // The service will try to access accountInfo.result which is undefined
               expect(consoleDebugSpy).toHaveBeenCalledWith('accountInfo:', undefined);
          });
     });

     describe('logAssets', () => {
          it('should log both assets when provided', () => {
               const asset = { currency: 'USD', issuer: 'rIssuer', value: '100' };
               const asset2 = { currency: 'XRP', value: '1000' };

               service.logAssets(asset, asset2);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(2);
               expect(consoleDebugSpy).toHaveBeenCalledWith('asset:', asset);
               expect(consoleDebugSpy).toHaveBeenCalledWith('asset2:', asset2);
          });

          it('should log only first asset when second is null', () => {
               const asset = { currency: 'USD', issuer: 'rIssuer', value: '100' };
               const asset2 = null;

               service.logAssets(asset, asset2);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('asset:', asset);
          });

          it('should log only second asset when first is null', () => {
               const asset = null;
               const asset2 = { currency: 'XRP', value: '1000' };

               service.logAssets(asset, asset2);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('asset2:', asset2);
          });

          it('should log nothing when both are null', () => {
               service.logAssets(null, null);

               expect(consoleDebugSpy).not.toHaveBeenCalled();
          });

          it('should handle undefined values', () => {
               const asset = { currency: 'USD' };
               const asset2 = undefined;

               service.logAssets(asset, asset2);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('asset:', asset);
          });
     });

     describe('logObjects', () => {
          it('should log object.result when result property exists', () => {
               const type = 'TestType';
               const object = { result: { data: 'test data' } };

               service.logObjects(type, object);

               expect(consoleDebugSpy).toHaveBeenCalledWith(type, object.result);
          });

          it('should log the whole object when result property does not exist', () => {
               const type = 'TestType';
               const object = { data: 'test data' };

               service.logObjects(type, object);

               expect(consoleDebugSpy).toHaveBeenCalledWith(type, object);
          });

          it('should handle object being null - will throw error', () => {
               const type = 'TestType';
               const object = null;

               // The service will throw because it tries to access null.result
               expect(() => {
                    service.logObjects(type, object);
               }).toThrow();
          });

          it('should handle object being undefined - will throw error', () => {
               const type = 'TestType';
               const object = undefined;

               // The service will throw because it tries to access undefined.result
               expect(() => {
                    service.logObjects(type, object);
               }).toThrow();
          });
     });

     describe('logEscrowObjects', () => {
          it('should log escrowObjects and escrow when both provided', () => {
               const escrowObjects: any = { result: { account_objects: [{ Sequence: 1 }] } };
               const escrow = { id: 'escrow1', amount: '1000' };

               service.logEscrowObjects(escrowObjects, escrow);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(2);
               expect(consoleDebugSpy).toHaveBeenCalledWith('escrowObjects:', escrowObjects.result);
               expect(consoleDebugSpy).toHaveBeenCalledWith('escrow:', escrow);
          });

          it('should log only escrowObjects when escrow is null', () => {
               const escrowObjects: any = { result: { account_objects: [{ Sequence: 1 }] } };
               const escrow = null;

               service.logEscrowObjects(escrowObjects, escrow);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('escrowObjects:', escrowObjects.result);
          });

          it('should log only escrow when escrowObjects is null', () => {
               const escrowObjects = null as any;
               const escrow = { id: 'escrow1', amount: '1000' };

               service.logEscrowObjects(escrowObjects, escrow);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('escrow:', escrow);
          });

          it('should log nothing when both are null', () => {
               service.logEscrowObjects(null as any, null);

               expect(consoleDebugSpy).not.toHaveBeenCalled();
          });

          it('should handle escrowObjects without result', () => {
               const escrowObjects: any = { account_objects: [{ Sequence: 1 }] };
               const escrow = null;

               service.logEscrowObjects(escrowObjects, escrow);

               // The service tries to access escrowObjects.result which is undefined
               expect(consoleDebugSpy).toHaveBeenCalledWith('escrowObjects:', undefined);
          });

          it('should handle undefined values for escrow', () => {
               const escrowObjects: any = { result: { account_objects: [] } };
               const escrow = undefined;

               service.logEscrowObjects(escrowObjects, escrow);

               expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
               expect(consoleDebugSpy).toHaveBeenCalledWith('escrowObjects:', escrowObjects.result);
          });
     });
});
