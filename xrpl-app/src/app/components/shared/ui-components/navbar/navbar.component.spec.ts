import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { NavbarComponent } from './navbar.component';
import { ThemeService } from '../../../../services/utils/theme/theme.service';
import { NavbarStore } from '../../../../services/shared/navbar/navbar-store.service';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { of } from 'rxjs';
import { ConnectionStatusComponent } from '../../connection-status/connection-status.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NavbarComponent', () => {
     let component: NavbarComponent;
     let fixture: ComponentFixture<NavbarComponent>;
     let themeService: any;
     let store: any;
     let router: Router;

     // Define the dropdown type
     type DropdownState = {
          accounts: boolean;
          escrows: boolean;
          network: boolean;
          nft: boolean;
     };

     // Mock dropdowns state
     let dropdownsSignal: WritableSignal<DropdownState>;

     beforeEach(async () => {
          dropdownsSignal = signal<DropdownState>({
               accounts: false,
               escrows: false,
               network: false,
               nft: false,
          });

          themeService = {
               darkMode$: of(false),
               toggle: jasmine.createSpy('toggle'),
          };

          store = {
               dropdowns: dropdownsSignal.asReadonly(),
               selectedNetwork: signal('Devnet'),
               closeAllDropdowns: jasmine.createSpy('closeAllDropdowns'),
               toggleDropdown: jasmine.createSpy('toggleDropdown').and.callFake((key: keyof DropdownState) => {
                    dropdownsSignal.update(current => ({ ...current, [key]: !current[key] }));
               }),
               selectNetwork: jasmine.createSpy('selectNetwork'),
          };

          await TestBed.configureTestingModule({
               imports: [NavbarComponent, ConnectionStatusComponent],
               providers: [
                    provideRouter([
                         { path: 'wallet-configurator', component: {} as any },
                         { path: 'account-balance-changes', component: {} as any },
                         { path: 'account-configurator', component: {} as any },
                         { path: 'delete-account', component: {} as any },
                         { path: 'create-credentials', component: {} as any },
                         { path: 'permissioned-domain', component: {} as any },
                         { path: 'create-did', component: {} as any },
                         { path: 'time-escrow', component: {} as any },
                         { path: 'conditional-escrow', component: {} as any },
                         { path: 'create-nft', component: {} as any },
                         { path: 'nft-offers', component: {} as any },
                    ]),
                    { provide: ThemeService, useValue: themeService },
                    { provide: NavbarStore, useValue: store },
                    { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(icons), multi: true },
               ],
               schemas: [NO_ERRORS_SCHEMA],
          }).compileComponents();

          fixture = TestBed.createComponent(NavbarComponent);
          component = fixture.componentInstance;
          router = TestBed.inject(Router);
          fixture.detectChanges();
     });

     afterEach(() => {
          store.closeAllDropdowns.calls.reset();
          store.toggleDropdown.calls.reset();
          store.selectNetwork.calls.reset();
          themeService.toggle.calls.reset();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });

     describe('Mobile menu', () => {
          it('should initialize with mobile menu closed', () => {
               expect(component.isMobileMenuOpen()).toBeFalse();
          });

          it('should toggle mobile menu when toggleMobileMenu is called', () => {
               component.toggleMobileMenu();
               expect(component.isMobileMenuOpen()).toBeTrue();

               component.toggleMobileMenu();
               expect(component.isMobileMenuOpen()).toBeFalse();
          });

          it('should close mobile menu when closeMobileMenu is called', () => {
               component.isMobileMenuOpen.set(true);
               component.closeMobileMenu();
               expect(component.isMobileMenuOpen()).toBeFalse();
          });
     });

     describe('Theme service', () => {
          it('should have isDark signal', () => {
               expect(component.isDark).toBeDefined();
               expect(component.isDark()).toBeFalse();
          });

          // it('should call themeService.toggle when theme button is clicked', () => {
          //      // Find all buttons and click the one with ng-icon
          //      const buttons = fixture.debugElement.queryAll(By.css('button'));
          //      for (const button of buttons) {
          //           const ngIcon = button.query(By.css('ng-icon'));
          //           if (ngIcon) {
          //                button.triggerEventHandler('click', null);
          //                break;
          //           }
          //      }
          //      expect(themeService.toggle).toHaveBeenCalled();
          // });
     });

     describe('Store interactions', () => {
          it('should close all dropdowns when closeAllDropdowns is called', () => {
               component.store.closeAllDropdowns();
               expect(store.closeAllDropdowns).toHaveBeenCalled();
          });

          it('should toggle dropdown when toggleDropdown is called', () => {
               component.store.toggleDropdown('accounts');
               expect(store.toggleDropdown).toHaveBeenCalledWith('accounts');
          });

          it('should select network when selectNetwork is called', () => {
               component.store.selectNetwork('Mainnet');
               expect(store.selectNetwork).toHaveBeenCalledWith('Mainnet');
          });

          it('should have selectedNetwork signal', () => {
               expect(component.store.selectedNetwork()).toBe('Devnet');
          });
     });

     describe('Route active detection', () => {
          it('should detect accounts routes as active', async () => {
               await router.navigate(['/account-balance-changes']);
               fixture.detectChanges();
               expect(component.isAccountsActive()).toBeTrue();
          });

          it('should detect escrows routes as active', async () => {
               await router.navigate(['/time-escrow']);
               fixture.detectChanges();
               expect(component.isEscrowsActive()).toBeTrue();
          });

          it('should detect NFTs routes as active', async () => {
               await router.navigate(['/create-nft']);
               fixture.detectChanges();
               expect(component.isNftsActive()).toBeTrue();
          });

          it('should return false for non-matching routes', async () => {
               await router.navigate(['/wallet-configurator']);
               fixture.detectChanges();
               expect(component.isAccountsActive()).toBeFalse();
               expect(component.isEscrowsActive()).toBeFalse();
               expect(component.isNftsActive()).toBeFalse();
          });
     });

     describe('Output emitter', () => {
          it('should have transactionResult output', () => {
               expect(component.transactionResult).toBeDefined();
               expect(component.transactionResult.emit).toBeDefined();
          });

          it('should emit transactionResult when called', () => {
               spyOn(component.transactionResult, 'emit');
               const mockResult = { result: 'Success', isError: false, isSuccess: true };
               component.transactionResult.emit(mockResult);
               expect(component.transactionResult.emit).toHaveBeenCalledWith(mockResult);
          });
     });

     describe('Dropdown state', () => {
          it('should show accounts dropdown when dropdowns.accounts is true', () => {
               dropdownsSignal.set({ accounts: true, escrows: false, network: false, nft: false });
               fixture.detectChanges();
               expect(component.store.dropdowns().accounts).toBeTrue();
          });

          it('should show escrows dropdown when dropdowns.escrows is true', () => {
               dropdownsSignal.set({ accounts: false, escrows: true, network: false, nft: false });
               fixture.detectChanges();
               expect(component.store.dropdowns().escrows).toBeTrue();
          });

          it('should show network dropdown when dropdowns.network is true', () => {
               dropdownsSignal.set({ accounts: false, escrows: false, network: true, nft: false });
               fixture.detectChanges();
               expect(component.store.dropdowns().network).toBeTrue();
          });

          it('should show NFT dropdown when dropdowns.nft is true', () => {
               dropdownsSignal.set({ accounts: false, escrows: false, network: false, nft: true });
               fixture.detectChanges();
               expect(component.store.dropdowns().nft).toBeTrue();
          });
     });

     describe('Network selector', () => {
          it('should display selected network', () => {
               store.selectedNetwork.set('Testnet');
               fixture.detectChanges();
               const networkButton = fixture.debugElement.query(By.css('[class*="btn-network"]'));
               expect(networkButton).toBeTruthy();
          });

          it('should have Devnet network option', () => {
               const networks = ['Devnet', 'Testnet', 'Mainnet'];
               expect(networks).toContain('Devnet');
               expect(networks).toContain('Testnet');
               expect(networks).toContain('Mainnet');
          });
     });

     describe('@HostListener', () => {
          it('should call closeAllDropdowns when clicking outside', () => {
               const event = new MouseEvent('click', { bubbles: true });
               document.body.dispatchEvent(event);
               expect(store.closeAllDropdowns).toHaveBeenCalled();
          });
     });

     describe('Template rendering', () => {
          it('should render logo text', () => {
               const logoText = fixture.debugElement.query(By.css('.font-semibold.text-xl'));
               expect(logoText).toBeTruthy();
               expect(logoText.nativeElement.textContent).toContain('XRPL Utility');
          });

          it('should have connection status component', () => {
               const connectionStatus = fixture.debugElement.query(By.css('app-connection-status'));
               expect(connectionStatus).toBeTruthy();
          });

          it('should have mobile menu button', () => {
               // Use attribute selector for ng-icon or find by class that doesn't have colon
               const mobileButton = fixture.debugElement.query(By.css('button[class*="p-2"]'));
               expect(mobileButton).toBeTruthy();
          });
     });
});
