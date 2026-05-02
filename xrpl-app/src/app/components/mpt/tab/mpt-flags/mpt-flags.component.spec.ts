import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MptFlagsComponent } from './mpt-flags.component';
import { MptUtilService } from '../../../../services/mpt/mpt-util/mpt-util.service';
import { MptFlags } from '../../constants/mpt.types';

describe('MptFlagsComponent', () => {
     let component: MptFlagsComponent;
     let fixture: ComponentFixture<MptFlagsComponent>;
     let mptUtilService: any;

     // Writable signals for mptUtilService
     let flagsSignal: WritableSignal<MptFlags>;
     let totalFlagsValueSignal: WritableSignal<number>;
     let totalFlagsHexSignal: WritableSignal<string>;

     beforeEach(async () => {
          // Initialize writable signals
          flagsSignal = signal({
               canLock: false,
               isRequireAuth: false,
               canEscrow: false,
               canTrade: false,
               canTransfer: false,
               canClawback: false,
          });

          totalFlagsValueSignal = signal(0);
          totalFlagsHexSignal = signal('0x0');

          mptUtilService = {
               flags: flagsSignal,
               totalFlagsValue: totalFlagsValueSignal,
               totalFlagsHex: totalFlagsHexSignal,
               toggleFlag: jasmine.createSpy('toggleFlag'),
          };

          await TestBed.configureTestingModule({
               imports: [MptFlagsComponent],
               providers: [{ provide: MptUtilService, useValue: mptUtilService }],
          })
               .overrideComponent(MptFlagsComponent, { set: { template: '<div></div>' } })
               .compileComponents();

          fixture = TestBed.createComponent(MptFlagsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          mptUtilService.toggleFlag.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('toggleFlag', () => {
          it('should call mptUtilService.toggleFlag with canLock', () => {
               component.toggleFlag('canLock');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canLock');
          });

          it('should call mptUtilService.toggleFlag with isRequireAuth', () => {
               component.toggleFlag('isRequireAuth');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('isRequireAuth');
          });

          it('should call mptUtilService.toggleFlag with canEscrow', () => {
               component.toggleFlag('canEscrow');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canEscrow');
          });

          it('should call mptUtilService.toggleFlag with canTrade', () => {
               component.toggleFlag('canTrade');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canTrade');
          });

          it('should call mptUtilService.toggleFlag with canTransfer', () => {
               component.toggleFlag('canTransfer');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canTransfer');
          });

          it('should call mptUtilService.toggleFlag with canClawback', () => {
               component.toggleFlag('canClawback');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canClawback');
          });
     });

     describe('Service binding', () => {
          it('should have mptUtilService injected', () => {
               expect(component.mptUtilService).toBe(mptUtilService);
          });

          it('should display flags from service', () => {
               expect(component.mptUtilService.flags()).toBe(flagsSignal());
          });

          it('should display totalFlagsValue from service', () => {
               totalFlagsValueSignal.set(42);
               expect(component.mptUtilService.totalFlagsValue()).toBe(42);
          });

          it('should display totalFlagsHex from service', () => {
               totalFlagsHexSignal.set('0x2A');
               expect(component.mptUtilService.totalFlagsHex()).toBe('0x2A');
          });
     });

     describe('Flag state tracking', () => {
          it('should reflect canLock state from service', () => {
               flagsSignal.update(f => ({ ...f, canLock: true }));
               fixture.detectChanges();
               expect(component.mptUtilService.flags().canLock).toBeTrue();
          });

          it('should reflect isRequireAuth state from service', () => {
               flagsSignal.update(f => ({ ...f, isRequireAuth: true }));
               fixture.detectChanges();
               expect(component.mptUtilService.flags().isRequireAuth).toBeTrue();
          });

          it('should reflect canEscrow state from service', () => {
               flagsSignal.update(f => ({ ...f, canEscrow: true }));
               fixture.detectChanges();
               expect(component.mptUtilService.flags().canEscrow).toBeTrue();
          });

          it('should reflect canTrade state from service', () => {
               flagsSignal.update(f => ({ ...f, canTrade: true }));
               fixture.detectChanges();
               expect(component.mptUtilService.flags().canTrade).toBeTrue();
          });

          it('should reflect canTransfer state from service', () => {
               flagsSignal.update(f => ({ ...f, canTransfer: true }));
               fixture.detectChanges();
               expect(component.mptUtilService.flags().canTransfer).toBeTrue();
          });

          it('should reflect canClawback state from service', () => {
               flagsSignal.update(f => ({ ...f, canClawback: true }));
               fixture.detectChanges();
               expect(component.mptUtilService.flags().canClawback).toBeTrue();
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should have flags available for template', () => {
               expect(component.mptUtilService.flags()).toBeDefined();
          });

          it('should have totalFlagsValue available for template', () => {
               expect(component.mptUtilService.totalFlagsValue()).toBeDefined();
          });

          it('should have totalFlagsHex available for template', () => {
               expect(component.mptUtilService.totalFlagsHex()).toBeDefined();
          });
     });

     describe('Edge cases', () => {
          it('should handle rapid flag toggles', () => {
               component.toggleFlag('canLock');
               component.toggleFlag('canLock');
               component.toggleFlag('canLock');

               expect(mptUtilService.toggleFlag).toHaveBeenCalledTimes(3);
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canLock');
          });

          it('should handle toggling all flags', () => {
               component.toggleFlag('canLock');
               component.toggleFlag('isRequireAuth');
               component.toggleFlag('canEscrow');
               component.toggleFlag('canTrade');
               component.toggleFlag('canTransfer');
               component.toggleFlag('canClawback');

               expect(mptUtilService.toggleFlag).toHaveBeenCalledTimes(6);
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canLock');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('isRequireAuth');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canEscrow');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canTrade');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canTransfer');
               expect(mptUtilService.toggleFlag).toHaveBeenCalledWith('canClawback');
          });

          it('should handle totalFlagsValue changes', () => {
               totalFlagsValueSignal.set(0x00000002 | 0x00000004);
               expect(component.mptUtilService.totalFlagsValue()).toBe(6);
          });

          it('should handle totalFlagsHex changes', () => {
               totalFlagsHexSignal.set('0x00000006');
               expect(component.mptUtilService.totalFlagsHex()).toBe('0x00000006');
          });
     });
});
