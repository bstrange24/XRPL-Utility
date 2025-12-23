import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../../services/local-storage/storage.service';
import { XrplService } from '../../services/xrpl-services/xrpl.service';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { formatInTimeZone } from 'date-fns-tz';
import { UtilsService } from '../../services/util-service/utils.service';
import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';
import * as xrpl from 'xrpl';
import { NetworkService } from '../../services/network-service/network.service';

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
     currentDateTime: string = ''; // Store formatted date/time
     isDarkMode = false;
     // private timerSubscription: Subscription | null = null; // For real-time updates
     private searchSubject = new Subject<void>();
     transactionInput = '';
     spinner = false;
     connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
     connectionStatusMessage = 'Disconnected';
     private subs: Subscription[] = [];
     expandedGroup: 'accounts' | 'escrows' | 'nfts' | 'mpt' | null = null;

     constructor(private readonly storageService: StorageService, private readonly utilsService: UtilsService, private readonly xrplService: XrplService, private readonly router: Router, private readonly datePipe: DatePipe, private networkService: NetworkService) {}

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

          // Initialize date/time and set up timer for real-time updates
          // this.updateDateTime();
          // this.timerSubscription = interval(100).subscribe(() => {
          //      this.updateDateTime();
          // });

          this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
               this.getTransaction();
          });

          const saved = localStorage.getItem('darkMode');
          if (saved) {
               this.isDarkMode = saved === 'true';
          } else {
               this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          }
          this.applyDarkMode();
     }

     // private monitorConnectionStatus() {
     //      // Initial check
     //      this.checkConnection();

     //      // Check every 10 seconds (XRPL nodes can drop silently)
     //      this.connectionCheckInterval = setInterval(() => {
     //           this.checkConnection();
     //      }, 10000);
     // }

     toggleDarkMode() {
          this.isDarkMode = !this.isDarkMode;
          localStorage.setItem('darkMode', this.isDarkMode.toString());
          this.applyDarkMode();
     }

     private applyDarkMode() {
          if (this.isDarkMode) {
               document.body.classList.add('dark-mode');
          } else {
               document.body.classList.remove('dark-mode');
          }
     }

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
          // if (this.timerSubscription) {
          //      this.timerSubscription.unsubscribe();
          // }
          this.subs.forEach(s => s.unsubscribe());
          // if (this.timerSubscription) this.timerSubscription.unsubscribe();
     }

     updateDateTime() {
          const now = new Date();
          this.currentDateTime = formatInTimeZone(now, 'America/New_York', 'M/d/yyyy h:mm:ss aa');
     }

     toggleNetworkDropdown() {
          this.isNetworkDropdownOpen = !this.isNetworkDropdownOpen;
     }

     toggleAccountsDropdown(event: Event) {
          event.preventDefault();
          event.stopPropagation();
          this.expandedGroup = this.expandedGroup === 'accounts' ? null : 'accounts';
          this.isNetworkDropdownOpen = false;
     }

     ttoggleEscrowsDropdown(event: Event) {
          event.preventDefault();
          event.stopPropagation();
          this.expandedGroup = this.expandedGroup === 'escrows' ? null : 'escrows';
          this.isNetworkDropdownOpen = false;
     }

     toggleNftDropdown(event: Event) {
          event.preventDefault();
          event.stopPropagation();
          this.expandedGroup = this.expandedGroup === 'nfts' ? null : 'nfts';
          this.isNetworkDropdownOpen = false;
     }

     toggleMptDropdown(event: Event) {
          event.preventDefault();
          event.stopPropagation();
          this.expandedGroup = this.expandedGroup === 'mpt' ? null : 'mpt';
          this.isNetworkDropdownOpen = false;
     }

     toggleUtilsDropdown(event: Event) {
          event.preventDefault();
          this.isNetworkDropdownOpen = false;
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
     }

     setActiveEscrowLink(link: string) {
          this.storageService.setActiveEscrowLink(link);
     }

     setActiveAccountsLink(link: string) {
          this.storageService.setActiveAccountsLink(link);

          // CLOSE AFTER CLICK
          this.expandedGroup = null;

          // leave everything else untouched
          this.isNetworkDropdownOpen = false;
     }

     async disconnectClient(event: Event) {
          event.preventDefault();
          await this.xrplService.disconnect();
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
