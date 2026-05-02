import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavbarStore } from './navbar-store.service';
import { StorageService } from '../local-storage/storage.service';
import { NetworkService } from '../../utils/network/network-service';
import { XrplService } from '../../xrpl-services/xrpl.service';

describe('NavbarStore', () => {
     let store: NavbarStore;
     let storageServiceMock: any;
     let xrplServiceMock: any;
     let networkServiceMock: any;

     beforeEach(() => {
          storageServiceMock = {
               getNetworkColor: jasmine.createSpy('getNetworkColor').and.returnValue('#10b981'),
               setNet: jasmine.createSpy('setNet'),
               networkServers: {
                    devnet: 'wss://s.devnet.rippletest.net:51233',
                    testnet: 'wss://s.altnet.rippletest.net:51233',
                    mainnet: 'wss://xrplcluster.com',
               },
          };

          xrplServiceMock = {
               connectionStatus$: signal('connected'),
               connectionMessage$: signal('Connected to network'),
               disconnect: jasmine.createSpy('disconnect').and.returnValue(Promise.resolve()),
               getClient: jasmine.createSpy('getClient').and.returnValue(Promise.resolve({})),
          };

          networkServiceMock = {
               announceNetworkChange: jasmine.createSpy('announceNetworkChange'),
          };

          TestBed.configureTestingModule({
               providers: [NavbarStore, { provide: StorageService, useValue: storageServiceMock }, { provide: XrplService, useValue: xrplServiceMock }, { provide: NetworkService, useValue: networkServiceMock }],
          });

          store = TestBed.inject(NavbarStore);
     });

     it('should be created', () => {
          expect(store).toBeTruthy();
     });

     describe('initial state', () => {
          it('should have selectedNetwork default to Devnet', () => {
               expect(store.selectedNetwork()).toBe('Devnet');
          });

          it('should have networkColor default to #10b981', () => {
               expect(store.networkColor()).toBe('#10b981');
          });

          it('should have all dropdowns closed', () => {
               const dropdowns = store.dropdowns();
               expect(dropdowns.network).toBeFalse();
               expect(dropdowns.accounts).toBeFalse();
               expect(dropdowns.escrows).toBeFalse();
               expect(dropdowns.nft).toBeFalse();
               expect(dropdowns.mpt).toBeFalse();
          });

          it('should have empty transaction input', () => {
               expect(store.transactionInput()).toBe('');
          });

          it('should have loading as false', () => {
               expect(store.loading()).toBeFalse();
          });
     });

     describe('connectionStatus computed', () => {
          it('should return connection status from xrplService', () => {
               expect(store.connectionStatus()).toBe('connected');
          });
     });

     describe('connectionMessage computed', () => {
          it('should return connection message from xrplService', () => {
               expect(store.connectionMessage()).toBe('Connected to network');
          });
     });

     describe('toggleDropdown', () => {
          it('should toggle network dropdown and close others', () => {
               store.toggleDropdown('network');
               expect(store.dropdowns().network).toBeTrue();
               expect(store.dropdowns().accounts).toBeFalse();
               expect(store.dropdowns().escrows).toBeFalse();
               expect(store.dropdowns().nft).toBeFalse();
               expect(store.dropdowns().mpt).toBeFalse();

               store.toggleDropdown('network');
               expect(store.dropdowns().network).toBeFalse();
          });

          it('should toggle accounts dropdown and close others', () => {
               store.toggleDropdown('accounts');
               expect(store.dropdowns().accounts).toBeTrue();
               expect(store.dropdowns().network).toBeFalse();
               expect(store.dropdowns().escrows).toBeFalse();
               expect(store.dropdowns().nft).toBeFalse();
               expect(store.dropdowns().mpt).toBeFalse();
          });

          it('should toggle escrows dropdown and close others', () => {
               store.toggleDropdown('escrows');
               expect(store.dropdowns().escrows).toBeTrue();
               expect(store.dropdowns().network).toBeFalse();
               expect(store.dropdowns().accounts).toBeFalse();
               expect(store.dropdowns().nft).toBeFalse();
               expect(store.dropdowns().mpt).toBeFalse();
          });

          it('should toggle nft dropdown and close others', () => {
               store.toggleDropdown('nft');
               expect(store.dropdowns().nft).toBeTrue();
               expect(store.dropdowns().network).toBeFalse();
               expect(store.dropdowns().accounts).toBeFalse();
               expect(store.dropdowns().escrows).toBeFalse();
               expect(store.dropdowns().mpt).toBeFalse();
          });

          it('should toggle mpt dropdown and close others', () => {
               store.toggleDropdown('mpt');
               expect(store.dropdowns().mpt).toBeTrue();
               expect(store.dropdowns().network).toBeFalse();
               expect(store.dropdowns().accounts).toBeFalse();
               expect(store.dropdowns().escrows).toBeFalse();
               expect(store.dropdowns().nft).toBeFalse();
          });

          it('should toggle multiple times correctly', () => {
               store.toggleDropdown('network');
               expect(store.dropdowns().network).toBeTrue();
               store.toggleDropdown('accounts');
               expect(store.dropdowns().accounts).toBeTrue();
               expect(store.dropdowns().network).toBeFalse();
          });
     });

     describe('selectNetwork', () => {
          it('should select network and update color', async () => {
               storageServiceMock.getNetworkColor.and.returnValue('#ff0000');

               await store.selectNetwork('Testnet');

               expect(store.selectedNetwork()).toBe('Testnet');
               expect(store.networkColor()).toBe('#ff0000');
               expect(storageServiceMock.setNet).toHaveBeenCalledWith(storageServiceMock.networkServers.testnet, 'testnet');
               expect(xrplServiceMock.disconnect).toHaveBeenCalled();
               expect(xrplServiceMock.getClient).toHaveBeenCalled();
               expect(networkServiceMock.announceNetworkChange).toHaveBeenCalledWith('testnet');
          });

          it('should select Devnet network', async () => {
               await store.selectNetwork('Devnet');
               expect(store.selectedNetwork()).toBe('Devnet');
               expect(storageServiceMock.setNet).toHaveBeenCalledWith(storageServiceMock.networkServers.devnet, 'devnet');
          });

          it('should select Mainnet network', async () => {
               await store.selectNetwork('Mainnet');
               expect(store.selectedNetwork()).toBe('Mainnet');
               expect(storageServiceMock.setNet).toHaveBeenCalledWith(storageServiceMock.networkServers.mainnet, 'mainnet');
          });

          it('should handle getClient error gracefully', async () => {
               xrplServiceMock.getClient.and.returnValue(Promise.reject(new Error('Connection failed')));

               await store.selectNetwork('Testnet');

               expect(store.selectedNetwork()).toBe('Testnet');
               expect(networkServiceMock.announceNetworkChange).toHaveBeenCalled();
          });
     });

     describe('closeAllDropdowns', () => {
          it('should close all dropdowns', () => {
               store.toggleDropdown('network');
               store.toggleDropdown('accounts');
               // expect(store.dropdowns().network).toBeTrue();
               expect(store.dropdowns().accounts).toBeTrue();

               store.closeAllDropdowns();

               expect(store.dropdowns().network).toBeFalse();
               expect(store.dropdowns().accounts).toBeFalse();
               expect(store.dropdowns().escrows).toBeFalse();
               expect(store.dropdowns().nft).toBeFalse();
               expect(store.dropdowns().mpt).toBeFalse();
          });
     });

     describe('Edge Cases', () => {
          it('should handle unknown network name', async () => {
               await store.selectNetwork('UnknownNetwork');
               expect(store.selectedNetwork()).toBe('UnknownNetwork');
               expect(storageServiceMock.setNet).toHaveBeenCalledWith(undefined, 'unknownnetwork');
          });

          it('should handle uppercase network names correctly', async () => {
               await store.selectNetwork('DEVNET');
               expect(store.selectedNetwork()).toBe('DEVNET');
               expect(storageServiceMock.setNet).toHaveBeenCalledWith(storageServiceMock.networkServers.devnet, 'devnet');
          });

          it('should toggle same dropdown twice', () => {
               store.toggleDropdown('network');
               expect(store.dropdowns().network).toBeTrue();
               store.toggleDropdown('network');
               expect(store.dropdowns().network).toBeFalse();
          });
     });
});
