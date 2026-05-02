import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { ConnectionStatusComponent } from './connection-status.component';
import { XrplService } from '../../../services/xrpl-services/xrpl.service';
import { ConnectionGuardService } from '../../../services/shared/connection-guard/connection-guard.service';
import { NavbarStore } from '../../../services/shared/navbar/navbar-store.service';

describe('ConnectionStatusComponent', () => {
     let component: ConnectionStatusComponent;
     let fixture: ComponentFixture<ConnectionStatusComponent>;

     // Services
     let xrplService: any;
     let connectionGuard: any;
     let store: any;

     // Connection status signals
     let connectionStatusSignal: any;
     let connectionMessageSignal: any;
     let hasPendingOperationsSignal: any;

     beforeEach(async () => {
          // Create writable signals for testing
          connectionStatusSignal = signal('connected');
          connectionMessageSignal = signal('Connected to XRPL network');
          hasPendingOperationsSignal = signal(false);

          xrplService = {
               connectionStatus$: connectionStatusSignal,
               connectionMessage$: connectionMessageSignal,
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
               getConnectionStatus: jasmine.createSpy('getConnectionStatus').and.returnValue('connected'),
          };

          connectionGuard = {
               hasPendingOperations: hasPendingOperationsSignal.asReadonly(),
               isConnectionReady: jasmine.createSpy('isConnectionReady').and.returnValue(true),
               getConnectionStatus: jasmine.createSpy('getConnectionStatus').and.returnValue('connected'),
          };

          store = {};

          await TestBed.configureTestingModule({
               imports: [ConnectionStatusComponent],
               providers: [
                    { provide: XrplService, useValue: xrplService },
                    { provide: ConnectionGuardService, useValue: connectionGuard },
                    { provide: NavbarStore, useValue: store },
               ],
          }).compileComponents();

          fixture = TestBed.createComponent(ConnectionStatusComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     afterEach(() => {
          // Reset any spies
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('isConnected', () => {
          it('should return true when connection status is connected', () => {
               connectionStatusSignal.set('connected');
               expect(component.isConnected()).toBeTrue();
          });

          it('should return false when connection status is not connected', () => {
               connectionStatusSignal.set('connecting');
               expect(component.isConnected()).toBeFalse();

               connectionStatusSignal.set('disconnected');
               expect(component.isConnected()).toBeFalse();
          });
     });

     describe('isConnecting', () => {
          it('should return true when connection status is connecting', () => {
               connectionStatusSignal.set('connecting');
               expect(component.isConnecting()).toBeTrue();
          });

          it('should return false when connection status is not connecting', () => {
               connectionStatusSignal.set('connected');
               expect(component.isConnecting()).toBeFalse();

               connectionStatusSignal.set('disconnected');
               expect(component.isConnecting()).toBeFalse();
          });
     });

     describe('isDisconnected', () => {
          it('should return true when connection status is disconnected', () => {
               connectionStatusSignal.set('disconnected');
               expect(component.isDisconnected()).toBeTrue();
          });

          it('should return false when connection status is not disconnected', () => {
               connectionStatusSignal.set('connected');
               expect(component.isDisconnected()).toBeFalse();

               connectionStatusSignal.set('connecting');
               expect(component.isDisconnected()).toBeFalse();
          });
     });

     describe('statusMessage', () => {
          it('should return the connection message from xrplService', () => {
               connectionMessageSignal.set('Test connection message');
               expect(component.statusMessage()).toBe('Test connection message');
          });
     });

     describe('hasPendingOperations', () => {
          it('should return true when there are pending operations', () => {
               hasPendingOperationsSignal.set(true);
               expect(component.hasPendingOperations()).toBeTrue();
          });

          it('should return false when there are no pending operations', () => {
               hasPendingOperationsSignal.set(false);
               expect(component.hasPendingOperations()).toBeFalse();
          });
     });

     describe('statusText', () => {
          it('should return "Connected" when connected', () => {
               connectionStatusSignal.set('connected');
               expect(component.statusText()).toBe('Connected');
          });

          it('should return "Connecting..." when connecting', () => {
               connectionStatusSignal.set('connecting');
               expect(component.statusText()).toBe('Connecting...');
          });

          it('should return "Disconnected" when disconnected', () => {
               connectionStatusSignal.set('disconnected');
               expect(component.statusText()).toBe('Disconnected');
          });
     });

     describe('Service injections', () => {
          it('should have xrplService injected', () => {
               expect(component['xrplService']).toBe(xrplService);
          });

          it('should have connectionGuard injected', () => {
               expect(component['connectionGuard']).toBe(connectionGuard);
          });

          it('should have store injected', () => {
               expect(component.store).toBe(store);
          });
     });

     describe('Template bindings (indirect tests)', () => {
          it('should show connected state UI when connected', () => {
               connectionStatusSignal.set('connected');
               fixture.detectChanges();

               const indicator = fixture.debugElement.nativeElement.querySelector('.connection-indicator');
               expect(indicator.classList).toContain('connected');
          });

          it('should show connecting state UI when connecting', () => {
               connectionStatusSignal.set('connecting');
               fixture.detectChanges();

               const indicator = fixture.debugElement.nativeElement.querySelector('.connection-indicator');
               expect(indicator.classList).toContain('connecting');
          });

          it('should show disconnected state UI when disconnected', () => {
               connectionStatusSignal.set('disconnected');
               fixture.detectChanges();

               const indicator = fixture.debugElement.nativeElement.querySelector('.connection-indicator');
               expect(indicator.classList).toContain('disconnected');
          });

          it('should show pending operations spinner when hasPendingOperations is true', () => {
               hasPendingOperationsSignal.set(true);
               fixture.detectChanges();

               const spinner = fixture.debugElement.nativeElement.querySelector('.spinner');
               expect(spinner).toBeTruthy();
          });

          it('should not show pending operations spinner when hasPendingOperations is false', () => {
               hasPendingOperationsSignal.set(false);
               fixture.detectChanges();

               const spinner = fixture.debugElement.nativeElement.querySelector('.spinner');
               expect(spinner).toBeFalsy();
          });

          it('should display status text correctly', () => {
               connectionStatusSignal.set('connected');
               fixture.detectChanges();

               const statusText = fixture.debugElement.nativeElement.querySelector('.status-text');
               expect(statusText.textContent).toContain('Connected');
          });
     });

     describe('Edge cases', () => {
          it('should handle unknown connection status', () => {
               connectionStatusSignal.set('unknown' as any);
               fixture.detectChanges();

               // Should default to disconnected behavior
               expect(component.isConnected()).toBeFalse();
               expect(component.isConnecting()).toBeFalse();
               expect(component.isDisconnected()).toBeFalse();
               expect(component.statusText()).toBe('Disconnected');
          });

          it('should handle null connection message', () => {
               connectionMessageSignal.set(null);
               expect(component.statusMessage()).toBeNull();
          });

          it('should handle empty connection message', () => {
               connectionMessageSignal.set('');
               expect(component.statusMessage()).toBe('');
          });

          it('should handle rapid status changes', () => {
               connectionStatusSignal.set('connecting');
               expect(component.statusText()).toBe('Connecting...');

               connectionStatusSignal.set('connected');
               expect(component.statusText()).toBe('Connected');

               connectionStatusSignal.set('disconnected');
               expect(component.statusText()).toBe('Disconnected');
          });

          it('should handle pending operations toggling', () => {
               hasPendingOperationsSignal.set(true);
               expect(component.hasPendingOperations()).toBeTrue();

               hasPendingOperationsSignal.set(false);
               expect(component.hasPendingOperations()).toBeFalse();
          });
     });
});
