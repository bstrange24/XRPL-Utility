import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, ActivatedRoute, RouterOutlet } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { ToastService } from './services/utils/toast/toast.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { WalletPanelComponent } from './components/wallet-panel/wallet-panel.component';
import { NavbarComponent } from './components/shared/ui-components/navbar/navbar.component';
import { WalletDestinationBase } from './services/wallets/walletDestinationBase';
import { Wallet, WalletManagerService } from './services/wallets/manager/wallet-manager.service';
import { TransactionUiService } from './services/transaction-ui/transaction-ui.service';
import { TransactionDropdownService } from './services/transaction-dropdown/transaction-dropdown.service';
import { WalletDataService } from './services/wallets/refresh-wallet/refresh-wallets.service';
import { AcccountDataService } from './services/account-data/acccount-data.service';
import { StorageService } from './services/shared/local-storage/storage.service';
import { TxEnvironmentService } from './services/transaction-environment/tx-environment.service';
import { CopyUtilService } from './services/utils/copy-util/copy-util.service';
import { RightPanelService } from './services/right-panel/right-panel.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
     selector: 'app-root',
     standalone: true,
     imports: [RouterOutlet, CommonModule, WalletPanelComponent, NavbarComponent, LucideAngularModule],
     animations: [trigger('toastAnimation', [transition(':enter', [style({ opacity: 0, transform: 'translateY(100%)' }), animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))]), transition(':leave', [animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(50%)' }))])])],
     templateUrl: './app.component.html',
     styleUrls: ['./app.component.css'],
     changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent extends WalletDestinationBase implements OnInit {
     readonly isNavigating = signal(false);
     private readonly destroyRef = inject(DestroyRef);
     private readonly router = inject(Router);
     private readonly activatedRoute = inject(ActivatedRoute);
     private readonly titleService = inject(Title);
     public readonly rightPanelService = inject(RightPanelService);

     constructor(walletManager: WalletManagerService, transactionUiService: TransactionUiService, transactionDropdownService: TransactionDropdownService, walletDataService: WalletDataService, txEnvironmentService: TxEnvironmentService, copyUtilService: CopyUtilService, toastService: ToastService, acccountDataService: AcccountDataService, route: ActivatedRoute, storageService: StorageService) {
          super(walletManager, transactionUiService, transactionDropdownService, walletDataService, txEnvironmentService, copyUtilService, toastService, acccountDataService, route, storageService);
          this.transactionDropdownService.setupAutoSelectOnValidTypedAddress(this.destinationSearchQuery, this.selectedDestinationAddress, this.destinationMap);
          this.txUiService.clearAllOptionsAndMessages();
     }

     protected async onSelectedWalletIndexChange(): Promise<void> {}

     protected refreshAccountObject(_env: any): void {
          return;
     }

     protected clearInputFields(): void {
          return;
     }

     selectWallet(wallet: Wallet): void {
          if (wallet?.address === this.currentWallet()?.address) return;

          const index = this.walletManager.wallets().findIndex(w => w.address === wallet.address);
          if (index !== -1) {
               this.walletManager.setSelectedIndex(index); // ← Let service handle it
          }
     }

     ngOnInit() {
          this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
               if (event instanceof NavigationStart) {
                    this.isNavigating.set(true);
               } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
                    this.isNavigating.set(false);
               }
          });

          this.router.events
               .pipe(
                    filter(event => event instanceof NavigationEnd),
                    map(() => this.activatedRoute),
                    map(route => {
                         while (route.firstChild) route = route.firstChild;
                         return route;
                    }),
                    mergeMap(route => route.data),
                    takeUntilDestroyed(this.destroyRef)
               )
               .subscribe(data => {
                    if (data['title']) {
                         this.titleService.setTitle(data['title']);
                    } else {
                         this.titleService.setTitle('XRPL App'); // fallback
                    }
               });
     }

     isBalanceChangesPage(): boolean {
          const url = this.router.url;
          const isBalance = url === '/account-balance-changes' || url.startsWith('/account-balance-changes');
          return isBalance;
     }
}
