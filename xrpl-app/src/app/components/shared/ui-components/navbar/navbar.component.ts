import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { ThemeService } from '../../../../services/utils/theme/theme.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavbarStore } from '../../../../services/shared/navbar/navbar-store.service';
import { ConnectionStatusComponent } from '../../connection-status/connection-status.component';

@Component({
     selector: 'app-navbar',
     standalone: true,
     imports: [CommonModule, RouterModule, NgIcon, ConnectionStatusComponent],
     templateUrl: './navbar.component.html',
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
     store = inject(NavbarStore);
     themeService = inject(ThemeService);
     elRef = inject(ElementRef);
     router = inject(Router);

     isDark = toSignal(this.themeService.darkMode$, { initialValue: false });

     @Output() transactionResult = new EventEmitter<{
          result: string;
          isError: boolean;
          isSuccess: boolean;
     }>();

     // Helper methods to check if any dropdown routes are active
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

     // optional: close dropdown on outside click
     @HostListener('document:click', ['$event'])
     onClick(event: MouseEvent) {
          if (!this.elRef.nativeElement.contains(event.target)) {
               this.store.closeAllDropdowns();
          }
     }
}
