import { Component, OnInit, EventEmitter, Output, Injectable, inject, ElementRef, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../services/local-storage/storage.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { UtilsService } from '../../services/util-service/utils.service';
import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';
import * as xrpl from 'xrpl';
import { ThemeService } from '../../services/theme/theme.service';
import { NgIcon } from '@ng-icons/core';

@Injectable({ providedIn: 'root' })
export class NetworkService {
     private networkChangedSource = new Subject<string>();
     networkChanged$ = this.networkChangedSource.asObservable();

     announceNetworkChange(network: string) {
          this.networkChangedSource.next(network);
     }
}

@Component({
     selector: 'app-navbar',
     standalone: true,
     imports: [CommonModule, RouterModule, NgIcon],
     providers: [DatePipe],
     templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit {
     themeService = inject(ThemeService);
     isDark$ = this.themeService.darkMode$;
     @Output() transactionResult = new EventEmitter<{ result: string; isError: boolean; isSuccess: boolean }>();

     selectedNetwork = signal<string>('Devnet');
     networkColor = signal<string>('#1a1c21');
     navbarColor = signal<string>('#1a1c21');
     isNetworkDropdownOpen = signal<boolean>(false);
     isEscrowsDropdownOpen = signal<boolean>(false);
     isAccountDropdownOpen = signal<boolean>(false);
     isNftDropdownOpen = signal<boolean>(false);
     isMptDropdownOpen = signal<boolean>(false);
     isEscrowsDropdownActive: boolean = false;
     isNftDropdownActive: boolean = false;
     isMptDropdownActive: boolean = false;
     isAccountsDropdownActive: boolean = false;
     private searchSubject = new Subject<void>();
     transactionInput = signal<string>('');
     spinner = signal<boolean>(false);
     connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
     connectionStatusMessage = 'Disconnected';
     private subs: Subscription[] = [];

     constructor(
          private readonly storageService: StorageService,
          private readonly utilsService: UtilsService,
          private readonly xrplService: XrplService,
          private networkService: NetworkService,
          private elRef: ElementRef
     ) {}

     ngOnInit() {
          // Initialize network
          const { environment } = this.storageService.getNet();
          this.selectedNetwork.set(environment.charAt(0).toUpperCase() + environment.slice(1));
          this.networkColor.set(this.storageService.getNetworkColor(environment));

          // Start monitoring XRPL client connection status
          this.subs.push(this.xrplService.connectionStatus$.subscribe(s => (this.connectionStatus = s)));
          this.subs.push(this.xrplService.connectionMessage$.subscribe(m => (this.connectionStatusMessage = m)));

          // Kick off connection if not already started
          this.xrplService.getClient().catch(() => {});

          // Initialize active link
          const activeNavLink = this.storageService.getActiveNavLink();
          const activeEscrowLink = this.storageService.getActiveEscrowLink();
          const activeNftLink = this.storageService.getActiveNftLink();
          const activeMptLink = this.storageService.getActiveMptLink();
          this.isEscrowsDropdownActive = !!activeEscrowLink;
          const activeAccountLink = this.storageService.getActiveAccountsLink();
          this.isAccountDropdownOpen.set(!!activeAccountLink);
          this.isNftDropdownActive = !!activeNftLink;
          this.isMptDropdownActive = !!activeMptLink;

          if (activeAccountLink) {
               this.isAccountsDropdownActive = true;
               this.isAccountDropdownOpen.set(true);
               this.isEscrowsDropdownActive = false;
               this.isNftDropdownActive = false;
               this.isMptDropdownActive = false;
          } else if (activeEscrowLink) {
               this.isEscrowsDropdownActive = true;
               this.isAccountsDropdownActive = false;
               this.isNftDropdownActive = false;
               this.isMptDropdownActive = false;
          } else if (activeNftLink) {
               this.isNftDropdownActive = true;
               this.isAccountsDropdownActive = false;
               this.isEscrowsDropdownActive = false;
               this.isMptDropdownActive = false;
          } else if (activeMptLink) {
               this.isMptDropdownActive = true;
               this.isNftDropdownActive = false;
               this.isAccountsDropdownActive = false;
               this.isEscrowsDropdownActive = false;
          } else {
               this.isEscrowsDropdownActive = !!activeNavLink && activeNavLink.includes('escrow');
               this.isAccountsDropdownActive = !!activeNavLink && activeNavLink.includes('account');
               this.isNftDropdownActive = !!activeNavLink && activeNavLink.includes('nft');
               this.isMptDropdownActive = !!activeNavLink && activeNavLink.includes('mpt');
          }

          this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
               this.getTransaction();
          });
     }

     async checkConnection() {
          try {
               const client = await this.xrplService.getClient();

               if (!client?.isConnected()) {
                    this.connectionStatus = 'disconnected';
                    this.connectionStatusMessage = 'Disconnected from network';
                    return;
               }

               // Do a lightweight ping (server_info is fast)
               await client.request({ command: 'server_info' });

               this.connectionStatus = 'connected';
               this.connectionStatusMessage = `Connected to ${this.selectedNetwork()}`;
          } catch (err) {
               this.connectionStatus = 'disconnected';
               this.connectionStatusMessage = 'Failed to reach network';
          }
     }

     triggerSearch() {
          this.searchSubject.next();
     }

     ngOnDestroy() {
          this.subs.forEach(s => s.unsubscribe());
     }

     toggleNetworkDropdown() {
          this.isNetworkDropdownOpen.set(!this.isNetworkDropdownOpen());
          this.isEscrowsDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.isNftDropdownOpen = signal(false);
          this.isMptDropdownOpen.set(false);
     }

     toggleAccountsDropdown(event: Event) {
          event.preventDefault();
          event.stopPropagation(); // Prevent event bubbling that might interfere
          this.isAccountDropdownOpen.set(!this.isAccountDropdownOpen);
          this.isAccountsDropdownActive = this.isAccountDropdownOpen(); // Sync active state with open state
          this.isNetworkDropdownOpen.set(false);
          this.isEscrowsDropdownOpen.set(false);
          this.isNftDropdownOpen = signal(false);
          this.isMptDropdownOpen.set(false);
          this.isEscrowsDropdownActive = false; // Explicitly reset Escrows active state
          this.storageService.removeValue('activeEscrowLink'); // Clear escrow link from storage
     }

     toggleEscrowsDropdown(event: Event) {
          event.preventDefault();
          this.isEscrowsDropdownOpen.set(!this.isEscrowsDropdownOpen);
          this.isNetworkDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.isNftDropdownOpen = signal(false);
          this.isMptDropdownOpen.set(false);
          this.storageService.removeValue('activeAccountLink'); // Clear escrow link from storage
     }

     toggleNftDropdown(event: Event) {
          event.preventDefault();
          this.isNftDropdownOpen.set(!this.isNftDropdownOpen());
          this.isMptDropdownOpen.set(false);
          this.isNetworkDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.storageService.removeValue('activeAccountLink'); // Clear escrow link from storage
     }

     toggleMptDropdown(event: Event) {
          event.preventDefault();
          this.isMptDropdownOpen.set(!this.isMptDropdownOpen());
          this.isNftDropdownOpen = signal(false);
          this.isNetworkDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
          this.storageService.removeValue('activeAccountLink'); // Clear escrow link from storage
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
          this.xrplService.disconnect().then(() => {
               this.xrplService.getClient();
          });

          // Notify everyone that network changed
          this.networkService.announceNetworkChange(normalized);

          this.isNetworkDropdownOpen.set(false);
     }

     setActiveLink(link: string) {
          this.storageService.setActiveNavLink(link);
          this.isEscrowsDropdownActive = false;
          this.isEscrowsDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
     }

     setActiveEscrowLink(link: string) {
          this.storageService.setActiveEscrowLink(link);
          this.isEscrowsDropdownActive = true;
          this.isEscrowsDropdownOpen.set(false);
          this.isAccountDropdownOpen.set(false);
     }

     setActiveAccountsLink(link: string) {
          this.storageService.setActiveAccountsLink(link);
          this.storageService.removeValue('activeEscrowLink'); // Clear escrow link from storage
          this.isAccountDropdownOpen.set(true);
          this.isAccountsDropdownActive = true; // Mark Accounts dropdown as active
          this.isEscrowsDropdownActive = false; // Reset Escrows active state
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
          // Check if the click was inside our component (button or dropdown)
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
