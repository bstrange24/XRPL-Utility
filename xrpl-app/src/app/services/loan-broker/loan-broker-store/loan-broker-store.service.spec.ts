import { TestBed } from '@angular/core/testing';

import { LoanBrokerStoreService } from './loan-broker-store.service';

describe('LoanBrokerStoreService', () => {
  let service: InstanceType<typeof LoanBrokerStoreService>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanBrokerStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('clears form selections without clearing the loaded brokers', () => {
    const brokers = [{ index: 'broker-1' }] as any;
    service.setField('existingBrokers', brokers);
    service.setField('selectedBrokerId', 'broker-1');
    service.setField('manuallyFetchedBroker', brokers[0]);
    service.setField('vaultId', 'vault-1');

    service.resetFormFields();

    expect(service.selectedBrokerId()).toBeNull();
    expect(service.manuallyFetchedBroker()).toBeNull();
    expect(service.vaultId()).toBe('');
    expect(service.existingBrokers()).toBe(brokers);
  });
});
