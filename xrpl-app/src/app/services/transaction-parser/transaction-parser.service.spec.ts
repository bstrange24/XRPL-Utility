import { TestBed } from '@angular/core/testing';

import { TransactionParserService } from './transaction-parser.service';

describe('TransactionParserService', () => {
  let service: TransactionParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show transaction fees in drops', () => {
    const result = service.parse(
      {
        tx_json: {
          TransactionType: 'Payment',
          Account: 'rSender',
          Destination: 'rReceiver',
          Amount: '1250000',
          Fee: '12',
        },
        meta: { TransactionResult: 'tesSUCCESS', AffectedNodes: [] },
        validated: true,
        hash: 'ABC123',
        ledger_index: 123,
        close_time_iso: '2026-10-30T00:00:00Z',
      },
      'https://example.com/',
    );

    expect(result.keyDetails.find(detail => detail.label === 'Fee')?.value).toBe('12 drops');
    expect(result.keyDetails.find(detail => detail.label === 'Amount')?.value).toBe('1.25 XRP');
  });

  it('should decode NFT mint URIs and display the correct NFT flags', () => {
    const uri = 'https://example.com/nft.json';
    const result = service.parse(
      {
        tx_json: {
          TransactionType: 'NFTokenMint',
          Account: 'rSender',
          NFTokenTaxon: 0,
          Flags: 1 | 2 | 8 | 16,
          URI: Buffer.from(uri, 'utf8').toString('hex'),
          Fee: '12',
        },
        meta: { TransactionResult: 'tesSUCCESS', AffectedNodes: [] },
        validated: true,
        hash: 'ABC123',
        ledger_index: 123,
        close_time_iso: '2026-10-30T00:00:00Z',
      },
      'https://example.com/',
    );

    expect(result.keyDetails.find(detail => detail.label === 'URI')?.value).toBe(uri);
    expect(result.keyDetails.find(detail => detail.label === 'Properties')?.value).toBe('Burnable, Only XRP, Transferable, Mutable');
    expect(result.summary.description).toBe('Minted new NFT (burnable) (transferable)');
  });
});
