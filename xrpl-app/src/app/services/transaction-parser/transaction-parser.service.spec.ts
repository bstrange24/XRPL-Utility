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
});
