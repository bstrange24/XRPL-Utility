import { Component, OnInit, EventEmitter, Output, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/local-storage/storage.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { AppConstants } from '../../core/app.constants';
import { DatePipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { formatInTimeZone } from 'date-fns-tz';
import { UtilsService } from '../../services/util-service/utils.service';
import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';
import * as xrpl from 'xrpl';
import { RenderUiComponentsService } from '../../services/render-ui-components/render-ui-components.service';

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
     imports: [CommonModule, RouterModule],
     providers: [DatePipe],
     templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit {
     @Output() transactionResult = new EventEmitter<{ result: string; isError: boolean; isSuccess: boolean }>();
     selectedNetwork: string = 'Devnet';
     networkColor: string = '#1a1c21';
     navbarColor: string = '#1a1c21';
     isNetworkDropdownOpen: boolean = false;
     isEscrowsDropdownOpen: boolean = false;
     isAccountDropdownOpen: boolean = false;
     isNftDropdownOpen: boolean = false;
     isMptDropdownOpen: boolean = false;
     isUtilsDropdownOpen: boolean = false;
     isEscrowsDropdownActive: boolean = false;
     isNftDropdownActive: boolean = false;
     isMptDropdownActive: boolean = false;
     isAccountsDropdownActive: boolean = false;
     currentDateTime: string = ''; // Store formatted date/time
     private timerSubscription: Subscription | null = null; // For real-time updates
     private searchSubject = new Subject<void>();
     transactionInput = '';
     spinner = false;
     connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
     connectionStatusMessage = 'Disconnected';
     private subs: Subscription[] = [];

     constructor(private readonly storageService: StorageService, private readonly utilsService: UtilsService, private readonly xrplService: XrplService, private readonly router: Router, private readonly datePipe: DatePipe, private readonly renderUiComponentsService: RenderUiComponentsService, private networkService: NetworkService) {}

     ngOnInit() {
          // Initialize network
          const { environment } = this.storageService.getNet();
          this.selectedNetwork = environment.charAt(0).toUpperCase() + environment.slice(1);
          this.networkColor = this.storageService.getNetworkColor(environment);

          // Start monitoring XRPL client connection status
          // this.monitorConnectionStatus();
          // this.xrplService.getClient().then(() => this.checkConnection());
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
          this.isAccountDropdownOpen = !!activeAccountLink;
          this.isNftDropdownActive = !!activeNftLink;
          this.isMptDropdownActive = !!activeMptLink;

          if (activeAccountLink) {
               this.isAccountsDropdownActive = true;
               this.isAccountDropdownOpen = true;
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

          // Initialize date/time and set up timer for real-time updates
          this.updateDateTime();
          this.timerSubscription = interval(100).subscribe(() => {
               this.updateDateTime();
          });

          this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
               this.getTransaction();
          });
     }

     // private monitorConnectionStatus() {
     //      // Initial check
     //      this.checkConnection();

     //      // Check every 10 seconds (XRPL nodes can drop silently)
     //      this.connectionCheckInterval = setInterval(() => {
     //           this.checkConnection();
     //      }, 10000);
     // }

     async checkConnection() {
          try {
               const client = await this.xrplService.getClient();

               if (!client?.isConnected()) {
                    this.connectionStatus = 'disconnected';
                    this.connectionStatusMessage = 'Disconnected from network';
                    return;
               }

               // Optional: do a lightweight ping (server_info is fast)
               await client.request({ command: 'server_info' });

               this.connectionStatus = 'connected';
               this.connectionStatusMessage = `Connected to ${this.selectedNetwork}`;
          } catch (err) {
               this.connectionStatus = 'disconnected';
               this.connectionStatusMessage = 'Failed to reach network';
          }
     }

     triggerSearch() {
          this.searchSubject.next();
     }

     ngOnDestroy() {
          // Clean up timer subscription to prevent memory leaks
          if (this.timerSubscription) {
               this.timerSubscription.unsubscribe();
          }
          this.subs.forEach(s => s.unsubscribe());
          if (this.timerSubscription) this.timerSubscription.unsubscribe();
     }

     updateDateTime() {
          const now = new Date();
          this.currentDateTime = formatInTimeZone(now, 'America/New_York', 'M/d/yyyy h:mm:ss aa');
     }

     toggleNetworkDropdown() {
          this.isNetworkDropdownOpen = !this.isNetworkDropdownOpen;
          this.isEscrowsDropdownOpen = false;
          this.isUtilsDropdownOpen = false;
          this.isAccountDropdownOpen = false;
          this.isNftDropdownOpen = false;
          this.isMptDropdownOpen = false;
     }

     toggleAccountsDropdown(event: Event) {
          event.preventDefault();
          event.stopPropagation(); // Prevent event bubbling that might interfere
          this.isAccountDropdownOpen = !this.isAccountDropdownOpen;
          this.isAccountsDropdownActive = this.isAccountDropdownOpen; // Sync active state with open state
          this.isNetworkDropdownOpen = false;
          this.isEscrowsDropdownOpen = false;
          this.isNftDropdownOpen = false;
          this.isMptDropdownOpen = false;
          this.isEscrowsDropdownActive = false; // Explicitly reset Escrows active state
          this.isUtilsDropdownOpen = false;
          this.storageService.removeValue('activeEscrowLink'); // Clear escrow link from storage
     }

     toggleEscrowsDropdown(event: Event) {
          event.preventDefault();
          this.isEscrowsDropdownOpen = !this.isEscrowsDropdownOpen;
          this.isNetworkDropdownOpen = false;
          this.isUtilsDropdownOpen = false;
          this.isAccountDropdownOpen = false;
          this.isNftDropdownOpen = false;
          this.isMptDropdownOpen = false;
          this.storageService.removeValue('activeAccountLink'); // Clear escrow link from storage
     }

     toggleNftDropdown(event: Event) {
          event.preventDefault();
          this.isNftDropdownOpen = !this.isNftDropdownOpen;
          this.isMptDropdownOpen = false;
          this.isNetworkDropdownOpen = false;
          this.isUtilsDropdownOpen = false;
          this.isAccountDropdownOpen = false;
          this.storageService.removeValue('activeAccountLink'); // Clear escrow link from storage
     }

     toggleMptDropdown(event: Event) {
          event.preventDefault();
          this.isMptDropdownOpen = !this.isMptDropdownOpen;
          this.isNftDropdownOpen = false;
          this.isNetworkDropdownOpen = false;
          this.isUtilsDropdownOpen = false;
          this.isAccountDropdownOpen = false;
          this.storageService.removeValue('activeAccountLink'); // Clear escrow link from storage
     }

     toggleUtilsDropdown(event: Event) {
          event.preventDefault();
          this.isUtilsDropdownOpen = !this.isUtilsDropdownOpen;
          this.isNetworkDropdownOpen = false;
          this.isEscrowsDropdownOpen = false;
          this.isAccountDropdownOpen = false;
     }

     async selectNetwork(network: string) {
          const normalized = network.toLowerCase();
          this.selectedNetwork = network.charAt(0).toUpperCase() + network.slice(1);
          this.networkColor = this.storageService.getNetworkColor(normalized);

          // Show connecting state
          // this.connectionStatus = 'connecting';
          // this.connectionStatusMessage = 'Connecting...';

          // Update stored network + reconnect client
          this.storageService.setNet(this.storageService['networkServers'][normalized], normalized);

          // Reconnect XRPL client to new network
          this.xrplService.disconnect().then(() => {
               this.xrplService.getClient();
          });

          // Notify everyone that network changed
          this.networkService.announceNetworkChange(normalized);

          this.isNetworkDropdownOpen = false;
     }

     setActiveLink(link: string) {
          this.storageService.setActiveNavLink(link);
          this.isEscrowsDropdownActive = false;
          this.isEscrowsDropdownOpen = false;
          this.isUtilsDropdownOpen = false;
          this.isAccountDropdownOpen = false;
     }

     setActiveEscrowLink(link: string) {
          this.storageService.setActiveEscrowLink(link);
          this.isEscrowsDropdownActive = true;
          this.isEscrowsDropdownOpen = false;
          this.isUtilsDropdownOpen = false;
          this.isAccountDropdownOpen = false;
     }

     setActiveAccountsLink(link: string) {
          this.storageService.setActiveAccountsLink(link);
          this.storageService.removeValue('activeEscrowLink'); // Clear escrow link from storage
          this.isAccountDropdownOpen = true;
          this.isAccountsDropdownActive = true; // Mark Accounts dropdown as active
          this.isEscrowsDropdownActive = false; // Reset Escrows active state
          this.isEscrowsDropdownOpen = false;
          this.isUtilsDropdownOpen = false;
          this.isNetworkDropdownOpen = false;
     }

     private resetDropdownStates(exclude: string = '') {
          if (exclude !== 'network') {
               this.isNetworkDropdownOpen = false;
          }
          if (exclude !== 'accounts') {
               this.isAccountDropdownOpen = false;
               this.isAccountsDropdownActive = false;
          }
          if (exclude !== 'escrows') {
               this.isEscrowsDropdownOpen = false;
               this.isEscrowsDropdownActive = false;
          }
          if (exclude !== 'utils') {
               this.isUtilsDropdownOpen = false;
          }
     }

     async disconnectClient(event: Event) {
          event.preventDefault();
          await this.xrplService.disconnect();
          this.isUtilsDropdownOpen = false;
     }

     async getTransaction() {
          console.log('Entering getTransaction');
          const startTime = Date.now();
          this.spinner = true;

          const input = this.transactionInput.trim();
          if (!input) {
               this.transactionResult.emit({
                    result: `<p>ERROR: Transaction field cannot be empty</p>`,
                    isError: true,
                    isSuccess: false,
               });
               this.spinner = false;
               return;
          }
          if (!this.utilsService.isValidTransactionHash(input) && !this.utilsService.isValidCTID(input) && !xrpl.isValidAddress(input)) {
               this.transactionResult.emit({
                    result: `<p>ERROR: Invalid input. Must be a valid Transaction Hash, CTID, or Address</p>`,
                    isError: true,
                    isSuccess: false,
               });
               this.spinner = false;
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
                    this.renderUiComponentsService.renderTransactionsResults(txResponse, tempDiv);

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
               this.spinner = false;
               console.log(`Leaving getTransaction in ${Date.now() - startTime}ms`);
          }
     }
}
