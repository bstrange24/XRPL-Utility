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
});
