import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TransactionOptionalFieldsService } from './transaction-optional-fields.service';
import { UtilsService } from '../utils/util-service/utils.service';
import { XrplTxOptionsStore } from '../../components/shared/stores/xrpl-tx-options.store';
import { PermissionedDomainStoreService } from '../permissioned-domain/permissioned-domain-store/permissioned-domain-store.service';
import { CredentialStore } from '../credentials/credential-store/credential-store.service';
import { Wallet } from '../wallets/manager/wallet-manager.service';

describe('TransactionOptionalFieldsService', () => {
     let service: TransactionOptionalFieldsService;

     let utilsMock: jasmine.SpyObj<UtilsService>;
     let storeMock: any;
     let domainMock: any;
     let credentialMock: any;
     let xrplServiceMock: any;

     const wallet: Wallet = {
          address: 'r123',
          classicAddress: 'r123',
          seed: 'seed',
          name: 'test',
     } as Wallet;

     beforeEach(() => {
          utilsMock = jasmine.createSpyObj('UtilsService', ['setInvoiceIdField', 'setSourceTagField', 'setDestinationTag', 'setTickSize', 'setTransferRate', 'setMessageKey', 'setDomain', 'setDomainId', 'setTicketSequence', 'setMemoField1']);

          storeMock = {
               invoiceId: signal('INV123'),
               sourceTag: signal(10),
               destinationTag: signal('20'),
               isTicket: signal(false),
               selectedSingleTicket: signal(null),
               selectedTickets: signal([]),
               isMemoEnabled: signal(true),
               memos: signal('hello memo'),
          };

          domainMock = {
               domainId: signal('example.com'),
          };

          credentialMock = {
               credentialIDs: signal(['cred1', 'cred2']),
          };

          xrplServiceMock = {
               checkTicketExists: jasmine.createSpy().and.resolveTo(true),
          };

          TestBed.configureTestingModule({
               providers: [TransactionOptionalFieldsService, { provide: UtilsService, useValue: utilsMock }, { provide: XrplTxOptionsStore, useValue: storeMock }, { provide: PermissionedDomainStoreService, useValue: domainMock }, { provide: CredentialStore, useValue: credentialMock }],
          });

          service = TestBed.inject(TransactionOptionalFieldsService);

          (service as any).xrplService = xrplServiceMock;
     });

     it('should set invoice, sourceTag, and destinationTag', async () => {
          const tx: any = {};

          await service.setTxOptionalFields({} as any, tx, wallet, {}, 'sendXrp', {});

          expect(utilsMock.setInvoiceIdField).toHaveBeenCalledWith(tx, 'INV123');
          expect(utilsMock.setSourceTagField).toHaveBeenCalledWith(tx, 10);
          expect(utilsMock.setDestinationTag).toHaveBeenCalledWith(tx, '20');
     });

     it('should set memo when enabled', async () => {
          const tx: any = {};

          await service.setTxOptionalFields({} as any, tx, wallet, {}, 'sendXrp', {});

          expect(utilsMock.setMemoField1).toHaveBeenCalledWith(tx, jasmine.any(String));
     });

     it('should set domain on updateMetaData', async () => {
          const tx: any = {};

          await service.setTxOptionalFields({} as any, tx, wallet, { domain: 'test.com' }, 'updateMetaData', {});

          expect(utilsMock.setDomain).toHaveBeenCalled();
     });

     it('should set credential IDs on sendXrp', async () => {
          const tx: any = {};

          await service.setTxOptionalFields({} as any, tx, wallet, {}, 'sendXrp', {});

          expect(tx.CredentialIDs).toEqual(jasmine.any(Array) as any);
     });

     it('should set ticket sequence when ticket enabled', async () => {
          storeMock.isTicket.set(true);
          storeMock.selectedSingleTicket.set('5');

          const tx: any = {};

          await service.setTxOptionalFields({} as any, tx, wallet, {}, 'sendXrp', {});

          expect(xrplServiceMock.checkTicketExists).toHaveBeenCalled();
     });
});
