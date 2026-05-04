import { TestBed } from '@angular/core/testing';
import { PaymentChannelSignatureContextService } from './payment-channel-signature-context.service';

describe('PaymentChannelSignatureContextService', () => {
     let service: PaymentChannelSignatureContextService;
     let localStorageMock: { [key: string]: string };
     let fixedNow: number;

     beforeEach(() => {
          // Set fixed timestamp
          fixedNow = 1000000000000;

          // Mock Date.now to return fixed timestamp
          spyOn(Date, 'now').and.returnValue(fixedNow);

          // Setup localStorage mock
          localStorageMock = {};
          spyOn(localStorage, 'getItem').and.callFake((key: string) => localStorageMock[key] || null);
          spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
               localStorageMock[key] = value;
          });
          spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
               delete localStorageMock[key];
          });

          TestBed.configureTestingModule({
               providers: [PaymentChannelSignatureContextService],
          });

          service = TestBed.inject(PaymentChannelSignatureContextService);
     });

     afterEach(() => {
          localStorageMock = {};
     });

     describe('initialization', () => {
          it('should be created', () => {
               expect(service).toBeTruthy();
          });

          it('should load existing contexts from localStorage on init', () => {
               const existingContext = {
                    channelId: 'channel123',
                    amount: '1000',
                    savedAt: fixedNow,
               };
               localStorageMock['signature_contexts'] = JSON.stringify({ sig123: existingContext });

               const newService = TestBed.inject(PaymentChannelSignatureContextService);
               expect(newService.getSignatureContext('sig123')).toEqual(existingContext);
          });
     });

     describe('saveSignatureContext', () => {
          it('should save context to memory and localStorage', () => {
               const signature = 'testSignature123';
               const context = { channelId: 'channel123', amount: '1000' };

               service.saveSignatureContext(signature, context);

               expect(service.getSignatureContext(signature)).toBeDefined();
               expect(service.getSignatureContext(signature).channelId).toBe('channel123');
               expect(service.getSignatureContext(signature).amount).toBe('1000');
               expect(service.getSignatureContext(signature).savedAt).toBe(fixedNow);
               expect(localStorage.setItem).toHaveBeenCalled();
          });

          it('should preserve existing contexts when saving new one', () => {
               service.saveSignatureContext('sig1', { channelId: 'channel1' });
               service.saveSignatureContext('sig2', { channelId: 'channel2' });

               expect(service.getSignatureContext('sig1')).toBeDefined();
               expect(service.getSignatureContext('sig2')).toBeDefined();
          });

          it('should overwrite existing signature context', () => {
               service.saveSignatureContext('sig1', { channelId: 'channel1' });
               service.saveSignatureContext('sig1', { channelId: 'channel2' });

               expect(service.getSignatureContext('sig1').channelId).toBe('channel2');
          });
     });

     describe('getSignatureContext', () => {
          it('should return undefined for non-existent signature', () => {
               const result = service.getSignatureContext('nonexistent');
               expect(result).toBeUndefined();
          });

          it('should return context from memory if available', () => {
               const context = { channelId: 'channel123' };
               service.saveSignatureContext('sig1', context);

               const result = service.getSignatureContext('sig1');
               expect(result.channelId).toBe('channel123');
          });

          it('should load from localStorage if not in memory', () => {
               const context = { channelId: 'channel123', savedAt: fixedNow };
               localStorageMock['signature_contexts'] = JSON.stringify({ sig1: context });

               const result = service.getSignatureContext('sig1');
               expect(result.channelId).toBe('channel123');
          });
     });

     describe('hasSignatureContext', () => {
          it('should return true when context exists', () => {
               service.saveSignatureContext('sig1', { channelId: 'channel1' });
               expect(service.hasSignatureContext('sig1')).toBe(true);
          });

          it('should return false when context does not exist', () => {
               expect(service.hasSignatureContext('nonexistent')).toBe(false);
          });
     });

     describe('getSignatureFlags', () => {
          it('should return flags from context', () => {
               const flags = { tfMPTCanLock: true };
               service.saveSignatureContext('sig1', { channelId: 'channel1', flags });
               expect(service.getSignatureFlags('sig1')).toEqual(flags);
          });

          it('should return null when no flags in context', () => {
               service.saveSignatureContext('sig1', { channelId: 'channel1' });
               expect(service.getSignatureFlags('sig1')).toBeNull();
          });

          it('should return null when context does not exist', () => {
               expect(service.getSignatureFlags('nonexistent')).toBeNull();
          });
     });

     describe('clearOldContexts', () => {
          it('should remove contexts older than maxAge', () => {
               // Save old context (25 hours old)
               const oldContext = { channelId: 'old' };
               service.saveSignatureContext('sigOld', oldContext);

               // Manually override savedAt in storage to simulate old timestamp
               const allContexts = JSON.parse(localStorageMock['signature_contexts']);
               allContexts['sigOld'].savedAt = fixedNow - 25 * 60 * 60 * 1000;
               localStorageMock['signature_contexts'] = JSON.stringify(allContexts);

               // Also update the memory cache
               (service as any).signatureContexts.set('sigOld', allContexts['sigOld']);

               // Save new context (current time)
               const newContext = { channelId: 'new' };
               service.saveSignatureContext('sigNew', newContext);

               service.clearOldContexts(24 * 60 * 60 * 1000);

               expect(service.hasSignatureContext('sigOld')).toBe(false);
               expect(service.hasSignatureContext('sigNew')).toBe(true);
          });

          it('should use default 24 hour maxAge', () => {
               const oldContext = { channelId: 'old' };
               service.saveSignatureContext('sigOld', oldContext);

               // Manually override savedAt in storage
               const allContexts = JSON.parse(localStorageMock['signature_contexts']);
               allContexts['sigOld'].savedAt = fixedNow - 25 * 60 * 60 * 1000;
               localStorageMock['signature_contexts'] = JSON.stringify(allContexts);
               (service as any).signatureContexts.set('sigOld', allContexts['sigOld']);

               service.clearOldContexts();

               expect(service.hasSignatureContext('sigOld')).toBe(false);
          });

          it('should not remove contexts younger than maxAge', () => {
               const recentContext = { channelId: 'recent' };
               service.saveSignatureContext('sigRecent', recentContext);

               // Manually override savedAt to 1 hour old
               const allContexts = JSON.parse(localStorageMock['signature_contexts']);
               allContexts['sigRecent'].savedAt = fixedNow - 1 * 60 * 60 * 1000;
               localStorageMock['signature_contexts'] = JSON.stringify(allContexts);
               (service as any).signatureContexts.set('sigRecent', allContexts['sigRecent']);

               service.clearOldContexts();

               expect(service.hasSignatureContext('sigRecent')).toBe(true);
          });

          it('should update localStorage when contexts are removed', () => {
               const oldContext = { channelId: 'old' };
               service.saveSignatureContext('sigOld', oldContext);

               // Manually override savedAt
               const allContexts = JSON.parse(localStorageMock['signature_contexts']);
               allContexts['sigOld'].savedAt = fixedNow - 25 * 60 * 60 * 1000;
               localStorageMock['signature_contexts'] = JSON.stringify(allContexts);
               (service as any).signatureContexts.set('sigOld', allContexts['sigOld']);

               service.clearOldContexts();

               const stored = JSON.parse(localStorageMock['signature_contexts']);
               expect(stored['sigOld']).toBeUndefined();
          });
     });

     describe('clearSignatureContext', () => {
          it('should remove specific signature context', () => {
               service.saveSignatureContext('sig1', { channelId: 'channel1' });
               service.saveSignatureContext('sig2', { channelId: 'channel2' });

               service.clearSignatureContext('sig1');

               expect(service.hasSignatureContext('sig1')).toBe(false);
               expect(service.hasSignatureContext('sig2')).toBe(true);
          });

          it('should remove from localStorage as well', () => {
               service.saveSignatureContext('sig1', { channelId: 'channel1' });
               service.clearSignatureContext('sig1');

               const stored = JSON.parse(localStorageMock['signature_contexts']);
               expect(stored['sig1']).toBeUndefined();
          });

          it('should handle clearing non-existent signature', () => {
               service.clearSignatureContext('nonexistent');
               expect(service.hasSignatureContext('nonexistent')).toBe(false);
          });
     });
});
