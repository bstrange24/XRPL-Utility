import { TestBed } from '@angular/core/testing';

import { TransactionPreviewParserService } from './transaction-preview-parser.service';

describe('TransactionPreviewParserService', () => {
  let service: TransactionPreviewParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionPreviewParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should format XRPL date fields and omit empty generic fields', () => {
    const preview = service.parse({
      TransactionType: 'CustomTransaction',
      Date: 846686722,
      Flags: 0,
      Domain: '',
    });

    expect(preview.keyDetails.some(detail => detail.label === 'Flags')).toBeFalse();
    expect(preview.keyDetails.some(detail => detail.label === 'Domain')).toBeFalse();
    expect(preview.keyDetails.find(detail => detail.label === 'Date')?.value).toContain('2026');
  });

  it('should show transaction fees in drops and native XRP amounts as XRP', () => {
    const preview = service.parse({
      TransactionType: 'Payment',
      Account: 'rSender',
      Destination: 'rReceiver',
      Amount: '1250000',
      Fee: '12',
    });

    expect(preview.keyDetails.find(detail => detail.label === 'Fee')?.value).toBe('12 drops');
    expect(preview.estimatedImpact.xrpUsed).toBe('1.250012 XRP');
  });

  it('should decode the hex-encoded URI in an NFT mint preview', () => {
    const preview = service.parse({
      TransactionType: 'NFTokenMint',
      NFTokenTaxon: 0,
      URI: Buffer.from('https://example.com/nft.json', 'utf8').toString('hex'),
      Fee: '12',
    });

    expect(preview.keyDetails.find(detail => detail.label === 'URI')?.value).toBe('https://example.com/nft.json');
  });

  it('should use DeliverMax for modern Payment summaries and estimated XRP impact', () => {
    const preview = service.parse({
      TransactionType: 'Payment',
      Account: 'rSender',
      Destination: 'rReceiver',
      DeliverMax: '2500000',
      Fee: '12',
    });

    expect(preview.summary.description).toContain('2.5 XRP');
    expect(preview.keyDetails.find(detail => detail.label === 'Amount')?.value).toBe('2.5 XRP');
    expect(preview.estimatedImpact.xrpUsed).toBe('2.500012 XRP');
  });

  it('should interpret OfferCreate flags as independent bits', () => {
    const preview = service.parse({
      TransactionType: 'OfferCreate',
      Flags: 65536 | 524288,
      TakerGets: '1000000',
      TakerPays: '2000000',
      Fee: '12',
    });

    expect(preview.summary.title).toBe('Sell Order');
    expect(preview.keyDetails.find(detail => detail.label === 'Order Type')?.value).toBe('Passive');
  });

  it('should preserve fractional issued-currency amounts', () => {
    const preview = service.parse({
      TransactionType: 'Payment',
      Account: 'rSender',
      Destination: 'rReceiver',
      Amount: { currency: 'USD', issuer: 'rIssuer', value: '1.25' },
      Fee: '12',
    });

    expect(preview.keyDetails.find(detail => detail.label === 'Amount')?.value).toBe('1.25 USD');
  });

  it('should show trustline flags in the TrustSet preview', () => {
    const preview = service.parse({
      TransactionType: 'TrustSet',
      LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
      Flags: 1048576,
      Fee: '12',
    });

    expect(preview.keyDetails.find(detail => detail.label === 'Trust Line Flags')?.value).toBe('Freeze trust line');
  });

  it('should display all enabled NFT mint flags in the sent preview', () => {
    const preview = service.parse({
      TransactionType: 'NFTokenMint',
      NFTokenTaxon: 0,
      Flags: 1 | 8 | 16,
      Fee: '12',
    });

    expect(preview.summary.description).toContain('burnable, transferable, mutable');
    expect(preview.keyDetails.find(detail => detail.label === 'NFT Flags')?.value).toBe('Burnable, Transferable, Mutable');
  });

  it('should recognize the protocol PaymentChannelClaim close flag', () => {
    const preview = service.parse({
      TransactionType: 'PaymentChannelClaim',
      Channel: 'A'.repeat(64),
      Flags: 131072,
      Fee: '12',
    });

    expect(preview.summary.title).toBe('Close Payment Channel');
  });

  it('should decode AccountSet domains and include clear-only flag changes', () => {
    const preview = service.parse({
      TransactionType: 'AccountSet',
      Domain: Buffer.from('example.com', 'utf8').toString('hex'),
      ClearFlag: 4,
      Fee: '12',
    });

    expect(preview.keyDetails.find(detail => detail.label === 'Domain')?.value).toBe('example.com');
    expect(preview.summary.description).toContain('Clear flag 4');
  });

  it('should summarize AcceptedCredentials on PermissionedDomainSet', () => {
    const preview = service.parse({
      TransactionType: 'PermissionedDomainSet',
      AcceptedCredentials: [{
        Credential: {
          CredentialType: Buffer.from('KYC', 'utf8').toString('hex'),
          Issuer: 'rIssuer',
        },
      }],
      Fee: '12',
    });

    expect(preview.summary.description).toBe('Add 1 credential');
    expect(preview.keyDetails.find(detail => detail.type === 'credential-list')?.credentials?.[0].type).toBe('KYC');
  });

  it('should warn when an escrow only has a cancellation time', () => {
    const preview = service.parse({
      TransactionType: 'EscrowCreate',
      Amount: '1000000',
      Destination: 'rReceiver',
      CancelAfter: 846686722,
      Fee: '12',
    });

    expect(preview.warnings?.some(warning => warning.includes('requires a release time'))).toBeTrue();
    expect(preview.estimatedImpact.xrpUsed).toBe('1.000012 XRP');
  });

  it('should format issued-currency escrow amounts without treating them as XRP', () => {
    const preview = service.parse({
      TransactionType: 'EscrowCreate',
      Amount: { currency: 'USD', issuer: 'rIssuer', value: '1.25' },
      Destination: 'rReceiver',
      FinishAfter: 846686722,
      Fee: '12',
    });

    expect(preview.summary.description).toContain('1.25 USD');
    expect(preview.keyDetails.find(detail => detail.label === 'Amount')?.value).toBe('1.25 USD');
    expect(preview.estimatedImpact.xrpUsed).toBe('0.000012 XRP');
  });

  it('should include XRP funded to a payment channel in estimated impact', () => {
    const preview = service.parse({
      TransactionType: 'PaymentChannelFund',
      Channel: 'A'.repeat(64),
      Amount: '500000',
      Fee: '12',
    });

    expect(preview.estimatedImpact.xrpUsed).toBe('0.500012 XRP');
  });

  it('should display descriptive summaries for transaction types without dedicated formatters', () => {
    const preview = service.parse({
      TransactionType: 'SetRegularKey',
      Fee: '12',
    });

    expect(preview.summary.title).toBe('Set Regular Key');
    expect(preview.summary.description).toBe('Remove the regular key');
  });

  it('should label the NFT burn submitter separately when the owner is unknown', () => {
    const preview = service.parse({
      TransactionType: 'NFTokenBurn',
      Account: 'rSubmitter',
      NFTokenID: 'A'.repeat(64),
      Fee: '12',
    });

    expect(preview.keyDetails.find(detail => detail.value === 'rSubmitter')?.label).toBe('Submitted By');
  });
});
