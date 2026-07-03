import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, HostListener, ElementRef, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { ThemeService } from '../../../../services/utils/theme/theme.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarStore } from '../../../../services/shared/navbar/navbar-store.service';
import { ConnectionStatusComponent } from '../../connection-status/connection-status.component';
import { XrplService } from '../../../../services/xrpl-services/xrpl.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-navbar',
     standalone: true,
     imports: [CommonModule, RouterModule, NgIcon, LucideAngularModule, ConnectionStatusComponent],
     templateUrl: './navbar.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
     @Output() openNetworkModalEvent = new EventEmitter<void>();
     public readonly store = inject(NavbarStore);
     public readonly themeService = inject(ThemeService);
     public readonly router = inject(Router);
     public readonly elRef = inject(ElementRef);
     private readonly xrplService = inject(XrplService);

     isMobileMenuOpen = signal(false);
     isDark = toSignal(this.themeService.darkMode$, { initialValue: false });

     // Use a signal that updates when network changes
     private readonly forceUpdate = signal(0);

     constructor() {
          // Listen for network changes from XRPL service
          effect(() => {
               // This will run whenever the XRPL service's network changes
               const network = this.xrplService.getNetworkName();
               console.log('Navbar detected network change:', network);
               // Force a UI update
               this.forceUpdate.update(v => v + 1);
          });

          // Also listen for storage changes (in case network is changed elsewhere)
          if (globalThis.window !== undefined) {
               globalThis.addEventListener('storage', event => {
                    if (event.key === 'network' || event.key?.includes('net')) {
                         console.log('Storage network change detected');
                         this.forceUpdate.update(v => v + 1);
                    }
               });

               // Listen for custom network changed event
               globalThis.addEventListener('networkChanged', ((event: CustomEvent) => {
                    console.log('Network changed event received:', event.detail);
                    this.forceUpdate.update(v => v + 1);
               }) as EventListener);
          }
     }

     // Computed signal that reads from XRPL service and forces update
     readonly selectedNetwork = computed(() => {
          // Force re-evaluation when forceUpdate changes
          this.forceUpdate();
          // Get network name from the source of truth
          return this.xrplService.getNetworkName();
     });

     @Output() transactionResult = new EventEmitter<{
          result: string;
          isError: boolean;
          isSuccess: boolean;
     }>();

     toggleMobileMenu() {
          this.isMobileMenuOpen.update(open => !open);
     }

     closeMobileMenu() {
          this.isMobileMenuOpen.set(false);
     }

     isAccountsActive(): boolean {
          const accountsRoutes = ['/account-balance-changes', '/account-configurator', '/delete-account', '/create-credentials', '/permissioned-domain', '/create-did'];
          return accountsRoutes.some(route => this.router.url === route || this.router.url.startsWith(route + '?'));
     }

     isEscrowsActive(): boolean {
          const escrowsRoutes = ['/time-escrow', '/conditional-escrow'];
          return escrowsRoutes.some(route => this.router.url === route || this.router.url.startsWith(route + '?'));
     }

     isNftsActive(): boolean {
          const nftRoutes = ['/create-nft', '/nft-offers'];
          return nftRoutes.some(route => this.router.url === route || this.router.url.startsWith(route + '?'));
     }

     isDeFiActive(): boolean {
          const defiRoutes = ['/vault', '/loan', '/loan-broker'];
          return defiRoutes.some(route => this.router.url === route || this.router.url.startsWith(route + '?'));
     }

     openNetworkModal() {
          this.openNetworkModalEvent.emit();
     }

     @HostListener('document:click', ['$event'])
     onClick(event: MouseEvent) {
          if (!this.elRef.nativeElement.contains(event.target)) {
               this.store.closeAllDropdowns();
          }
     }
}
