import { Component, OnInit, EventEmitter, Output, inject, ElementRef, HostListener, signal, computed, effect, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/local-storage/storage.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { UtilsService } from '../../services/util-service/utils.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';
import * as xrpl from 'xrpl';
import { ThemeService } from '../../services/theme/theme.service';
import { NgIcon } from '@ng-icons/core';
import { NetworkService } from '../../services/network/network-service';
import { ConnectionStatusComponent } from '../shared/connection-status/connection-status/connection-status.component';

@Component({
     selector: 'app-navbar',
     standalone: true,
     imports: [CommonModule, RouterModule, NgIcon, ConnectionStatusComponent],
     providers: [DatePipe],
     templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit {
     // Inject dependencies
     public themeService = inject(ThemeService);
     private readonly storageService = inject(StorageService);
     private readonly utilsService = inject(UtilsService);
     private readonly xrplService = inject(XrplService);
     private readonly networkService = inject(NetworkService);
     private readonly router = inject(Router);
     private readonly elRef = inject(ElementRef);
     private readonly destroyRef = inject(DestroyRef);
     private readonly searchSubject = new Subject<void>();
     private readonly searchSignal = toSignal(this.searchSubject.pipe(debounceTime(300)));

     // Outputs remain as EventEmitter (can't be signals)
     @Output() transactionResult = new EventEmitter<{ result: string; isError: boolean; isSuccess: boolean }>();

     // Signals
     selectedNetwork = signal<string>('Devnet');
     networkColor = signal<string>('#1a1c21');
     navbarColor = signal<string>('#1a1c21');
     isNetworkDropdownOpen = signal<boolean>(false);
     isEscrowsDropdownOpen = signal<boolean>(false);
     isAccountDropdownOpen = signal<boolean>(false);
     isNftDropdownOpen = signal<boolean>(false);
     isMptDropdownOpen = signal<boolean>(false);
     transactionInput = signal<string>('');
     spinner = signal<boolean>(false);

     // Computed signals from XrplService
     connectionStatus = computed(() => this.xrplService.connectionStatus$());
     connectionStatusMessage = computed(() => this.xrplService.connectionMessage$());

     // Theme signal
     isDark = toSignal(this.themeService.darkMode$, { initialValue: false });

     // Dropdown active states as signals
     isEscrowsDropdownActive = signal<boolean>(false);
     isNftDropdownActive = signal<boolean>(false);
     isMptDropdownActive = signal<boolean>(false);
     isAccountsDropdownActive = signal<boolean>(false);

     constructor() {
          // Set up effect to handle search debouncing
          effect(() => {
               const trigger = this.searchSignal();
               if (trigger !== undefined) {
                    this.getTransaction();
               }
          });

          // Set up effect to handle route changes
          effect(() => {
               // Watch router events via navigationEnd
               const subscription = this.router.events.subscribe(event => {
                    if (event instanceof NavigationEnd) {
                         this.updateActiveStates(event.urlAfterRedirects);
                    }
               });

               // Cleanup subscription when component is destroyed
               this.destroyRef.onDestroy(() => subscription.unsubscribe());
          });
     }

     ngOnInit() {
          // Initialize network
          const { environment } = this.storageService.getNet();
          this.selectedNetwork.set(environment.charAt(0).toUpperCase() + environment.slice(1));
          this.networkColor.set(this.storageService.getNetworkColor(environment));

          // Kick off connection if not already started
          this.xrplService.getClient().catch(() => {});

          // Initialize active links from storage
          this.initializeActiveLinks();
     }

     private initializeActiveLinks() {
          const activeNavLink = this.storageService.getActiveNavLink();
          const activeEscrowLink = this.storageService.getActiveEscrowLink();
          const activeNftLink = this.storageService.getActiveNftLink();
          const activeMptLink = this.storageService.getActiveMptLink();
          const activeAccountLink = this.storageService.getActiveAccountsLink();

          // Set dropdown states
          this.isEscrowsDropdownActive.set(!!activeEscrowLink);
          this.isNftDropdownActive.set(!!activeNftLink);
          this.isMptDropdownActive.set(!!activeMptLink);
          this.isAccountDropdownOpen.set(!!activeAccountLink);

          if (activeAccountLink) {
               this.isAccountsDropdownActive.set(true);
               this.isAccountDropdownOpen.set(true);
               this.isEscrowsDropdownActive.set(false);
               this.isNftDropdownActive.set(false);
               this.isMptDropdownActive.set(false);
          } else if (activeEscrowLink) {
               this.isEscrowsDropdownActive.set(true);
               this.isAccountsDropdownActive.set(false);
               this.isNftDropdownActive.set(false);
               this.isMptDropdownActive.set(false);
          } else if (activeNftLink) {
               this.isNftDropdownActive.set(true);
               this.isAccountsDropdownActive.set(false);
               this.isEscrowsDropdownActive.set(false);
               this.isMptDropdownActive.set(false);
          } else if (activeMptLink) {
               this.isMptDropdownActive.set(true);
               this.isNftDropdownActive.set(false);
               this.isAccountsDropdownActive.set(false);
               this.isEscrowsDropdownActive.set(false);
          } else {
               this.isEscrowsDropdownActive.set(!!activeNavLink && activeNavLink.includes('escrow'));
               this.isAccountsDropdownActive.set(!!activeNavLink && activeNavLink.includes('account'));
               this.isNftDropdownActive.set(!!activeNavLink && activeNavLink.includes('nft'));
               this.isMptDropdownActive.set(!!activeNavLink && activeNavLink.includes('mpt'));
          }
     }

     private updateActiveStates(url: string) {
          const cleanUrl = url.split('?')[0];

          // Reset all custom active flags
          this.isAccountsDropdownActive.set(false);
          this.isEscrowsDropdownActive.set(false);
          this.isNftDropdownActive.set(false);
          this.isMptDropdownActive.set(false);

          // Set correct state based on current URL
          if (cleanUrl.startsWith('/account') || cleanUrl === '/delete-account' || cleanUrl === '/permissioned-domain' || cleanUrl === '/create-credentials' || cleanUrl === '/create-did') {
               this.isAccountsDropdownActive.set(true);
               this.storageService.setActiveAccountsLink(cleanUrl);
          } else if (cleanUrl.startsWith('/time-escrow') || cleanUrl.startsWith('/conditional-escrow')) {
               this.isEscrowsDropdownActive.set(true);
               this.storageService.setActiveEscrowLink(cleanUrl);
          } else if (cleanUrl === '/checks') {
               this.storageService.setActiveNavLink(cleanUrl);
          }
     }

     async checkConnection() {
          try {
               const client = await this.xrplService.getClient();

               if (!client?.isConnected()) {
                    // Connection status is handled by XrplService signals
                    return;
               }

               // Do a lightweight ping
               await client.request({ command: 'server_info' });
               // Status is already updated by XrplService
          } catch (error: any) {
               console.error(`Error checking connection: ${error.message}`);
          }
     }

     triggerSearch() {
          this.searchSubject.next();
     }

     toggleNetworkDropdown() {
          this.isNetworkDropdownOpen.update(open => !open);
          this.isEscrowsDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.isNftDropdownOpen.set(false);
          this.isMptDropdownOpen.set(false);
     }

     toggleAccountsDropdown(event: Event) {
          event.preventDefault();
          event.stopPropagation();

          this.isAccountDropdownOpen.update(open => !open);
          this.isAccountsDropdownActive.set(this.isAccountDropdownOpen());
          this.isNetworkDropdownOpen.set(false);
          this.isEscrowsDropdownOpen.set(false);
          this.isNftDropdownOpen.set(false);
          this.isMptDropdownOpen.set(false);
          this.isEscrowsDropdownActive.set(false);
          this.storageService.removeValue('activeEscrowLink');
     }

     toggleEscrowsDropdown(event: Event) {
          event.preventDefault();
          this.isEscrowsDropdownOpen.update(open => !open);
          this.isNetworkDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.isNftDropdownOpen.set(false);
          this.isMptDropdownOpen.set(false);
          this.storageService.removeValue('activeAccountLink');
     }

     toggleNftDropdown(event: Event) {
          event.preventDefault();
          this.isNftDropdownOpen.update(open => !open);
          this.isMptDropdownOpen.set(false);
          this.isNetworkDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.storageService.removeValue('activeAccountLink');
     }

     toggleMptDropdown(event: Event) {
          event.preventDefault();
          this.isMptDropdownOpen.update(open => !open);
          this.isNftDropdownOpen.set(false);
          this.isNetworkDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.storageService.removeValue('activeAccountLink');
     }

     toggleUtilsDropdown(event: Event) {
          event.preventDefault();
          this.isNetworkDropdownOpen.set(false);
          this.isEscrowsDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
     }

     async selectNetwork(network: string) {
          const normalized = network.toLowerCase();
          this.selectedNetwork.set(network.charAt(0).toUpperCase() + network.slice(1));
          this.networkColor.set(this.storageService.getNetworkColor(normalized));

          // Update stored network + reconnect client
          this.storageService.setNet(this.storageService['networkServers'][normalized], normalized);

          // Reconnect XRPL client to new network
          await this.xrplService.disconnect();
          this.xrplService.getClient().catch(() => {});

          // Notify everyone that network changed
          this.networkService.announceNetworkChange(normalized);

          this.isNetworkDropdownOpen.set(false);
     }

     setActiveLink(link: string) {
          this.storageService.setActiveNavLink(link);
          this.isEscrowsDropdownActive.set(false);
          this.isEscrowsDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
     }

     setActiveEscrowLink(link: string) {
          this.storageService.setActiveEscrowLink(link);
          this.isEscrowsDropdownActive.set(true);
          this.isEscrowsDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
     }

     setActiveAccountsLink(link: string) {
          this.storageService.setActiveAccountsLink(link);
          this.storageService.removeValue('activeEscrowLink');
          this.isAccountDropdownOpen.set(true);
          this.isAccountsDropdownActive.set(true);
          this.isEscrowsDropdownActive.set(false);
          this.isEscrowsDropdownOpen.set(false);
          this.isNetworkDropdownOpen.set(false);
     }

     async disconnectClient(event: Event) {
          event.preventDefault();
          await this.xrplService.disconnect();
     }

     // Close dropdown when clicking outside
     @HostListener('document:click', ['$event'])
     onDocumentClick(event: MouseEvent) {
          if (!this.elRef.nativeElement.contains(event.target)) {
               this.isNetworkDropdownOpen.set(false);
          }
     }

     async getTransaction() {
          console.log('Entering getTransaction');
          const startTime = Date.now();
          this.spinner.set(true);

          const input = this.transactionInput().trim();
          if (!input) {
               this.transactionResult.emit({
                    result: `<p>ERROR: Transaction field cannot be empty</p>`,
                    isError: true,
                    isSuccess: false,
               });
               this.spinner.set(false);
               return;
          }

          if (!this.utilsService.isValidTransactionHash(input) && !this.utilsService.isValidCTID(input) && !xrpl.isValidAddress(input)) {
               this.transactionResult.emit({
                    result: `<p>ERROR: Invalid input. Must be a valid Transaction Hash, CTID, or Address</p>`,
                    isError: true,
                    isSuccess: false,
               });
               this.spinner.set(false);
               return;
          }

          try {
               const client = await this.xrplService.getClient();
               const tempDiv = document.createElement('div');

               let txResponse;
               if (this.utilsService.isValidTransactionHash(input)) {
                    txResponse = await client.request({
                         command: 'tx',
                         transaction: input,
                    });
               } else if (this.utilsService.isValidCTID(input)) {
                    txResponse = await client.request({
                         command: 'tx',
                         ctid: input,
                    });
               } else if (xrpl.isValidAddress(input)) {
                    txResponse = await client.request({
                         command: 'account_tx',
                         account: input,
                         ledger_index_min: -1,
                         ledger_index_max: -1,
                         limit: 10,
                    });
               }

               tempDiv.innerHTML += `\nTransaction data retrieved successfully.\n`;

               if (txResponse) {
                    this.transactionResult.emit({
                         result: tempDiv.innerHTML,
                         isError: false,
                         isSuccess: true,
                    });
               } else {
                    this.transactionResult.emit({
                         result: `<p>ERROR: No transaction data found.</p>`,
                         isError: true,
                         isSuccess: false,
                    });
               }
          } catch (error: any) {
               console.error('Error:', error);
               this.transactionResult.emit({
                    result: `ERROR: ${error.message || 'Unknown error'}`,
                    isError: true,
                    isSuccess: false,
               });
          } finally {
               this.spinner.set(false);
               console.log(`Leaving getTransaction in ${Date.now() - startTime}ms`);
          }
     }
}
