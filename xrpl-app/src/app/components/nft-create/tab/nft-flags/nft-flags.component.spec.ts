import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NftFlagsComponent } from './nft-flags.component';
import { NftUtilService } from '../../../../services/nft/nft-util/nft-util.service';

describe('NftFlagsComponent', () => {
     let component: NftFlagsComponent;
     let fixture: ComponentFixture<NftFlagsComponent>;
     let nftUtilService: any;

     // Create writable signals
     let nftFlagsSignal: WritableSignal<{
          burnableNft: boolean;
          onlyXrpNft: boolean;
          trustLine: boolean;
          transferableNft: boolean;
          mutableNft: boolean;
     }>;

     let totalFlagsValueSignal: WritableSignal<number>;
     let totalFlagsHexSignal: WritableSignal<string>;

     beforeEach(async () => {
          // Initialize writable signals
          nftFlagsSignal = signal({
               burnableNft: false,
               onlyXrpNft: false,
               trustLine: false,
               transferableNft: false,
               mutableNft: false,
          });

          totalFlagsValueSignal = signal(0);
          totalFlagsHexSignal = signal('0x0');

          nftUtilService = {
               nftFlags: nftFlagsSignal,
               nftFlagValues: {
                    burnableNft: 0x00000001,
                    onlyXrpNft: 0x00000002,
                    trustLine: 0x00000004,
                    transferableNft: 0x00000008,
                    mutableNft: 0x00000010,
               },
               totalFlagsValue: totalFlagsValueSignal,
               totalFlagsHex: totalFlagsHexSignal,
          };

          await TestBed.configureTestingModule({
               imports: [NftFlagsComponent],
               providers: [{ provide: NftUtilService, useValue: nftUtilService }],
          })
               .overrideComponent(NftFlagsComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(NftFlagsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          totalFlagsValueSignal.set(0);
          totalFlagsHexSignal.set('0x0');
          nftFlagsSignal.set({
               burnableNft: false,
               onlyXrpNft: false,
               trustLine: false,
               transferableNft: false,
               mutableNft: false,
          });
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('toggleFlag', () => {
          it('should toggle burnableNft flag', () => {
               component.toggleFlag('burnableNft');

               expect(nftFlagsSignal().burnableNft).toBeTrue();

               component.toggleFlag('burnableNft');

               expect(nftFlagsSignal().burnableNft).toBeFalse();
          });

          it('should toggle onlyXrpNft flag', () => {
               component.toggleFlag('onlyXrpNft');

               expect(nftFlagsSignal().onlyXrpNft).toBeTrue();

               component.toggleFlag('onlyXrpNft');

               expect(nftFlagsSignal().onlyXrpNft).toBeFalse();
          });

          it('should toggle transferableNft flag', () => {
               component.toggleFlag('transferableNft');

               expect(nftFlagsSignal().transferableNft).toBeTrue();

               component.toggleFlag('transferableNft');

               expect(nftFlagsSignal().transferableNft).toBeFalse();
          });

          it('should toggle mutableNft flag', () => {
               component.toggleFlag('mutableNft');

               expect(nftFlagsSignal().mutableNft).toBeTrue();

               component.toggleFlag('mutableNft');

               expect(nftFlagsSignal().mutableNft).toBeFalse();
          });

          it('should toggle trustLine flag', () => {
               component.toggleFlag('trustLine');

               expect(nftFlagsSignal().trustLine).toBeTrue();

               component.toggleFlag('trustLine');

               expect(nftFlagsSignal().trustLine).toBeFalse();
          });

          it('should update total flag value after toggling', () => {
               component.toggleFlag('burnableNft');

               expect(totalFlagsValueSignal()).toBe(0x00000001);
               expect(totalFlagsHexSignal()).toBe('0x00000001');
          });

          it('should accumulate multiple flags correctly', () => {
               component.toggleFlag('burnableNft');
               component.toggleFlag('onlyXrpNft');
               component.toggleFlag('transferableNft');

               const expectedSum = 0x00000001 | 0x00000002 | 0x00000008;
               expect(totalFlagsValueSignal()).toBe(expectedSum);
               expect(totalFlagsHexSignal()).toBe('0x' + expectedSum.toString(16).toUpperCase().padStart(8, '0'));
          });

          it('should remove flag value when toggled off', () => {
               component.toggleFlag('burnableNft');
               component.toggleFlag('onlyXrpNft');

               const expectedSum = 0x00000001 | 0x00000002;
               expect(totalFlagsValueSignal()).toBe(expectedSum);

               component.toggleFlag('burnableNft');

               expect(totalFlagsValueSignal()).toBe(0x00000002);
          });
     });

     describe('Service injections', () => {
          it('should have nftUtilService injected', () => {
               expect(component.nftUtilService).toBe(nftUtilService);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have nftFlags signal available for template', () => {
               expect(component.nftUtilService.nftFlags()).toBeDefined();
               expect(component.nftUtilService.nftFlags().burnableNft).toBeFalse();
          });

          it('should have totalFlagsValue signal available for template', () => {
               expect(component.nftUtilService.totalFlagsValue()).toBe(0);
          });

          it('should have totalFlagsHex signal available for template', () => {
               expect(component.nftUtilService.totalFlagsHex()).toBe('0x0');
          });
     });

     describe('Edge cases', () => {
          it('should handle rapid flag toggles', () => {
               for (let i = 0; i < 10; i++) {
                    component.toggleFlag('burnableNft');
               }

               // After even number of toggles, should be false
               expect(nftFlagsSignal().burnableNft).toBeFalse();
               expect(totalFlagsValueSignal()).toBe(0);
          });

          it('should handle all flags toggled on', () => {
               component.toggleFlag('burnableNft');
               component.toggleFlag('onlyXrpNft');
               component.toggleFlag('trustLine');
               component.toggleFlag('transferableNft');
               component.toggleFlag('mutableNft');

               const expectedSum = 0x00000001 | 0x00000002 | 0x00000004 | 0x00000008 | 0x00000010;
               expect(totalFlagsValueSignal()).toBe(expectedSum);
          });

          it('should handle all flags toggled off', () => {
               // Turn all on
               component.toggleFlag('burnableNft');
               component.toggleFlag('onlyXrpNft');
               component.toggleFlag('trustLine');
               component.toggleFlag('transferableNft');
               component.toggleFlag('mutableNft');

               // Turn all off
               component.toggleFlag('burnableNft');
               component.toggleFlag('onlyXrpNft');
               component.toggleFlag('trustLine');
               component.toggleFlag('transferableNft');
               component.toggleFlag('mutableNft');

               expect(totalFlagsValueSignal()).toBe(0);
               expect(totalFlagsHexSignal()).toBe('0x00000000'); // Fixed to match component output
          });
     });
});
