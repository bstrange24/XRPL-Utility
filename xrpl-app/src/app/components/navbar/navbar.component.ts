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
import { NgIcon } from '@ng-icons/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({
     selector: 'app-navbar',
     standalone: true,
     imports: [CommonModule, RouterModule, NgIcon],
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
     isCollapsed = false;

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

     toggleSidebar() {
          this.isCollapsed = !this.isCollapsed;

          // Close all groups when collapsing
          if (this.isCollapsed) {
               this.expandedGroup = null;
               this.isNetworkDropdownOpen = false;
          }
     }

     onAccountsClick(event: Event) {
          event.preventDefault();
          event.stopPropagation();

          if (this.isCollapsed) {
               // Default landing page for Accounts
               this.router.navigate(['/account-configurator']);
               return;
          }

          this.expandedGroup = this.expandedGroup === 'accounts' ? null : 'accounts';

          this.isNetworkDropdownOpen = false;
     }

     onNftsClick(event: Event) {
          event.preventDefault();
          event.stopPropagation();

          if (this.isCollapsed) {
               this.router.navigate(['/create-nft']);
               return;
          }

          this.expandedGroup = this.expandedGroup === 'nfts' ? null : 'nfts';
     }

     onEscrowsClick(event: Event) {
          event.preventDefault();
          event.stopPropagation();

          if (this.isCollapsed) {
               // Default Escrow landing page
               this.router.navigate(['/time-escrow']);
               return;
          }

          this.expandedGroup = this.expandedGroup === 'escrows' ? null : 'escrows';
     }

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
}
