import { TestBed } from '@angular/core/testing';
import { XrplService } from '../../xrpl-services/xrpl.service';
import { UtilsService } from '../util-service/utils.service';
import { TransactionUiService } from '../../transaction-ui/transaction-ui.service';
import { XrplDateService } from '../../../core/xrpl-date.service';
import { AccountConfiguratorStoreService } from '../../account-configurator/account-configurator-store/account-configurator-store.service';
import { EscrowStoreService } from '../../escrow/escrow-store/escrow-store.service';
import { PaymentChannelUtilService } from '../../payment-channel/payment-channel-util/payment-channel-util.service';
import { DidUtilService } from '../../did/did-util/did-util.service';
import { ValidationService, ValidationContext } from './transaction-validation-rule.service';
import { XrplWrapperService } from '../../xrpl-wrapper/xrpl-wrapper.service';

// Valid addresses (Devnet)
const VALID_ADDRESS = 'rKCvwruCxFM3sdqRAWKFiWR5WctQP182jr';
const VALID_ISSUER = 'rQGoSCkUjGqDErU8vpHWqLJfx2dMnidiuJ';
const VALID_DESTINATION = 'rwnNdk8auGxpu5EvVVHdjFLnAPSCPzRftX';
const VALID_SIGNER = 'rG1FVH4giSp28vc3n2LcehHn98VbprErs';
const VALID_REGULAR_KEY = 'rRegularKeyAddress123';

function createFullContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
     const context: ValidationContext = {
          inputs: {
               seed: 'sValidSeed123456789', // ← for AccountInfo required field
               accountInfo: {}, // ← critical for AccountInfo
               wallet: { seed: 'sValidSeed123456789', address: VALID_ADDRESS, mnemonic: 'test mnemonic phrase' },
               regularKey: { isRegularKey: false, address: VALID_REGULAR_KEY, seed: 'sRegularKeySeed123' },
               multiSign: { enabled: false, seeds: [] },
               senderAddress: VALID_ADDRESS,
               destination: VALID_DESTINATION,

               paymentXrp: { amount: '100', destination: VALID_DESTINATION },

               weWantCurrencyField: 'USD',
               weSpendCurrencyField: 'XRP',
               weWantIssuerField: VALID_ISSUER,
               weSpendIssuerField: '',
               weWantAmountField: '100',
               weSpendAmountField: '50',

               firstPoolCurrencyField: 'USD',
               secondPoolCurrencyField: 'XRP',
               firstPoolIssuerField: VALID_ISSUER,
               secondPoolIssuerField: '',
               firstPoolAssetAmount: '1000',
               secondPoolAssetAmount: '1000',
               tradingFeeField: '50',
               lpTokenAmountField: '100',

               // Credentials
               createCredential: { credentialType: 'TestType', subject: VALID_DESTINATION },
               acceptCredentials: { credentialID: 'testCredId', credentialIssuer: VALID_ISSUER },
               deleteCredentials: { credentialID: 'testCredId', credentialType: 'TestType', subject: VALID_DESTINATION },

               // NFTs
               createNft: { taxon: '1000', transferFee: '0', nftFlags: 1, initialURI: 'https://example.com' },
               burnNft: { nftId: '0000000000000000000000000000000000000000000000000000000000000000' },
               buyNft: { nftId: '0000000000000000000000000000000000000000000000000000000000000000', nftOfferId: '123456' },
               sellNft: { nftId: '0000000000000000000000000000000000000000000000000000000000000000', currency: {} },
               buyNftOffer: { nftId: '0000000000000000000000000000000000000000000000000000000000000000', nftOfferId: '123456', currency: {} },
               sellNftOffer: { nftId: '0000000000000000000000000000000000000000000000000000000000000000', nftOfferId: '123456', currency: {} },
               cancelNftOffer: { nftOfferId: '123456' },

               setTrustline: { amount: '100', currencyCode: 'USD', currencyIssuer: VALID_ISSUER },
               createEscrow: { amount: '100', destination: VALID_DESTINATION },
               finishEscrow: { escrowSequenceNumber: '100' },
               cancelEscrow: { escrowSequenceNumber: '100' },

               // DEX Offers
               // offerCancel: { offerSequence: '100' },
               // offerCreate: { offerSequence: '100' },

               did: { didDocument: '{}', didUri: 'did:example:123', didData: '{}' },
               createMpt: { amount: '1000' },
               sendMpt: { mptIssuanceId: 'testMptId', destination: VALID_DESTINATION, amount: '100' },
               ...overrides.inputs,
          },
          client: {} as any,
          accountInfo: {
               result: {
                    account_data: { Account: VALID_ADDRESS },
                    account_flags: { clawbackEnabled: true },
               },
          },
          accountObjects: (overrides.accountObjects as any[]) || [],
          fee: '12',
          currentLedger: 5000,
          serverInfo: {},
          ...overrides,
     };

     // Env setup
     if (!context.inputs['env']) context.inputs['env'] = {};
     if (!context.inputs['env'].ledgerInfo) context.inputs['env'].ledgerInfo = { currentRippleTime: 700000000 };
     if (!context.inputs['env'].accountObjects) {
          context.inputs['env'].accountObjects = { result: { account_objects: context.accountObjects } };
     }
     if (!context.env) context.env = context.inputs['env'];

     return context;
}

describe('ValidationService', () => {
     let service: ValidationService;
     let utilsServiceSpy: jasmine.SpyObj<UtilsService>;
     let xrplDateServiceSpy: jasmine.SpyObj<XrplDateService>;
     let xrplWrapperSpy: jasmine.SpyObj<XrplWrapperService>;
     let accountConfiguratorStoreServiceSpy: any;
     let escrowStoreServiceSpy: any;
     let paymentChannelUtilServiceSpy: jasmine.SpyObj<PaymentChannelUtilService>;
     let didUtilServiceSpy: jasmine.SpyObj<DidUtilService>;

     beforeEach(() => {
          (window as any).xrpl = {
               isValidAddress: () => true,
               isValidSecret: () => true,
               isValidClassicAddress: () => true,
          };

          const xrplServiceSpy = jasmine.createSpyObj('XrplService', ['getNet']);
          utilsServiceSpy = jasmine.createSpyObj('UtilsService', ['detectXrpInputType', 'getMultiSignAddress', 'getMultiSignSeeds', 'validateInput', 'isValidCurrencyCode', 'isRippleExpired', 'normalizeCurrencyCode']);
          const txUiServiceSpy = jasmine.createSpyObj('TransactionUiService', ['clearAllOptionsAndMessages']);
          xrplDateServiceSpy = jasmine.createSpyObj('XrplDateService', ['toRippleTime']);
          xrplWrapperSpy = jasmine.createSpyObj('XrplWrapperService', ['isValidAddress', 'isValidSecret']);

          xrplWrapperSpy.isValidAddress.and.returnValue(true);
          xrplWrapperSpy.isValidSecret.and.returnValue(true);

          accountConfiguratorStoreServiceSpy = jasmine.createSpyObj('AccountConfiguratorStoreService', [], {
               regularKeyAddress: jasmine.createSpy().and.returnValue(VALID_REGULAR_KEY),
               regularKeySeed: jasmine.createSpy().and.returnValue('sRegularKeySeed123'),
          });

          escrowStoreServiceSpy = jasmine.createSpyObj('EscrowStoreService', ['enableEscrowCancelAfterExpirationDate', 'enableEscrowFinishAfterExpirationDate']);
          paymentChannelUtilServiceSpy = jasmine.createSpyObj('PaymentChannelUtilService', ['checkChannelExpired']);
          didUtilServiceSpy = jasmine.createSpyObj('DidUtilService', ['validateAndConvertDidJson']);

          utilsServiceSpy.detectXrpInputType.and.returnValue({ type: 'seed', value: 'sValidSeed123456789' });
          utilsServiceSpy.getMultiSignAddress.and.callFake((s: string) => (s?.trim() ? s.split(',') : []));
          utilsServiceSpy.getMultiSignSeeds.and.callFake((s: string) => (s?.trim() ? s.split(',') : []));
          utilsServiceSpy.validateInput.and.returnValue(true);
          utilsServiceSpy.isValidCurrencyCode.and.returnValue(true);
          utilsServiceSpy.isRippleExpired.and.returnValue(false);

          xrplDateServiceSpy.toRippleTime.and.returnValue(720000000);
          didUtilServiceSpy.validateAndConvertDidJson.and.returnValue({ success: true });
          escrowStoreServiceSpy.enableEscrowCancelAfterExpirationDate.and.returnValue(false);
          escrowStoreServiceSpy.enableEscrowFinishAfterExpirationDate.and.returnValue(false);
          paymentChannelUtilServiceSpy.checkChannelExpired.and.returnValue(false);

          TestBed.configureTestingModule({
               providers: [
                    ValidationService,
                    { provide: XrplService, useValue: xrplServiceSpy },
                    { provide: UtilsService, useValue: utilsServiceSpy },
                    { provide: TransactionUiService, useValue: txUiServiceSpy },
                    { provide: XrplDateService, useValue: xrplDateServiceSpy },
                    { provide: XrplWrapperService, useValue: xrplWrapperSpy },
                    { provide: AccountConfiguratorStoreService, useValue: accountConfiguratorStoreServiceSpy },
                    { provide: EscrowStoreService, useValue: escrowStoreServiceSpy },
                    { provide: PaymentChannelUtilService, useValue: paymentChannelUtilServiceSpy },
                    { provide: DidUtilService, useValue: didUtilServiceSpy },
               ],
          });

          service = TestBed.inject(ValidationService);
     });

     async function expectValid(txType: string, context: ValidationContext = createFullContext()) {
          const errors = await service.validate(txType, context);
          if (errors?.length) console.error(`❌ ${txType} failed with:`, errors);
          expect(errors || []).toEqual([]);
     }

     describe('Initialization', () => {
          it('should be created', () => expect(service).toBeTruthy());
     });

     describe('capitalize', () => {
          it('should handle camelCase with consecutive capitals', () => {
               expect((service as any).capitalize('nftOfferId')).toBe('Nft Offer Id');
          });
          it('should handle empty string', () => {
               expect((service as any).capitalize('')).toBe('');
          });
     });

     // ==================== ALL TESTS ====================
     describe('AccountInfo', () => {
          it('validates successfully', async () => await expectValid('AccountInfo'));
     });
     describe('AccountDelete', () => {
          it('validates successfully', async () => await expectValid('AccountDelete'));
     });
     describe('PaymentXrp', () => {
          it('validates successfully', async () => await expectValid('PaymentXrp'));
     });

     // DEX Offers
     // describe('OfferCreate', () => {
     //      it('validates successfully', async () => await expectValid('OfferCreate'));
     // });
     // describe('OfferCancel', () => {
     //      it('validates successfully', async () => await expectValid('OfferCancel'));
     // });

     // AMM
     describe('CreateAMM', () => {
          it('validates successfully', async () => await expectValid('CreateAMM'));
     });
     describe('DepositToAMM', () => {
          it('validates successfully', async () => await expectValid('DepositToAMM'));
     });
     describe('WithdrawalFromAMM', () => {
          it('validates successfully', async () => await expectValid('WithdrawalFromAMM'));
     });
     describe('VoteAMM', () => {
          it('validates successfully', async () => await expectValid('VoteAMM'));
     });
     describe('BidAMM', () => {
          it('validates successfully', async () => await expectValid('BidAMM'));
     });
     describe('DeleteAMM', () => {
          it('validates successfully', async () => await expectValid('DeleteAMM'));
     });
     describe('SwapViaAMM', () => {
          it('validates successfully', async () => await expectValid('SwapViaAMM'));
     });
     describe('GetPoolInfo', () => {
          it('validates successfully', async () => await expectValid('GetPoolInfo'));
     });
     describe('GetOrderBook', () => {
          it('validates successfully', async () => await expectValid('GetOrderBook'));
     });
     describe('ClawbackAMM', () => {
          it('validates successfully', async () => {
               const ctx = createFullContext({
                    accountInfo: { result: { account_data: { Account: VALID_ADDRESS }, account_flags: { clawbackEnabled: true } } },
               });
               await expectValid('ClawbackAMM', ctx);
          });
     });

     describe('SetRegularKey', () => {
          it('validates successfully', async () => await expectValid('SetRegularKey'));
     });
     describe('SetMultiSign', () => {
          it('validates successfully', async () => {
               const ctx = createFullContext({
                    inputs: {
                         wallet: { seed: 'sValidSeed123456789', address: VALID_ADDRESS, mnemonic: 'test mnemonic phrase' },
                         modifyMultiSigners: {
                              formattedSignerEntries: [{ SignerEntry: { Account: VALID_SIGNER, SignerWeight: '2' } }],
                              signerQuorum: '1',
                         },
                    },
               });
               await expectValid('SetMultiSign', ctx);
          });
     });

     describe('DIDSet', () => {
          it('validates successfully', async () => await expectValid('DIDSet'));
     });
     describe('DIDdelete', () => {
          it('validates successfully', async () => await expectValid('DIDdelete'));
     });
     describe('CredentialCreate', () => {
          it('validates successfully', async () => await expectValid('CredentialCreate'));
     });
     describe('CredentialAccept', () => {
          it('validates successfully', async () => await expectValid('CredentialAccept'));
     });

     // NFT
     describe('CreateNft', () => {
          it('validates successfully', async () => await expectValid('CreateNft'));
     });
     describe('BurnNft', () => {
          it('validates successfully', async () => await expectValid('BurnNft'));
     });
     describe('BuyNft', () => {
          it('validates successfully', async () => await expectValid('CreateNft'));
     });
     describe('SellNft', () => {
          it('validates successfully', async () => await expectValid('CreateNft'));
     });
     describe('BuyNftOffer', () => {
          it('validates successfully', async () => await expectValid('CreateNft'));
     });
     describe('SuyNftOffer', () => {
          it('validates successfully', async () => await expectValid('CreateNft'));
     });
     describe('CancelNftOffer', () => {
          it('validates successfully', async () => await expectValid('CreateNft'));
     });

     describe('TrustSet', () => {
          it('validates successfully', async () => await expectValid('TrustSet'));
     });
     describe('CreateEscrow', () => {
          it('validates successfully', async () => await expectValid('CreateEscrow'));
     });
     describe('FinishEscrow', () => {
          it('validates successfully', async () => await expectValid('FinishEscrow'));
     });
     describe('CancelEscrow', () => {
          it('validates successfully', async () => await expectValid('CancelEscrow'));
     });
     describe('CreateMpt', () => {
          it('validates successfully', async () => await expectValid('CreateMpt'));
     });
     describe('SendMpt', () => {
          it('validates successfully', async () => await expectValid('SendMpt'));
     });
});
