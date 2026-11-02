import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MptStoreService } from '../../../../mpt/mpt-store/mpt-store.service';
import { MptUtilService } from '../../../../mpt/mpt-util/mpt-util.service';
import { XrplService } from '../../../../xrpl-services/xrpl.service';
import { WalletManagerService } from '../../../../wallets/manager/wallet-manager.service';
import { MptAuthorizeValidatorService } from './mpt-authorize-validator.service';

describe('MptAuthorizeValidatorService', () => {
  let service: MptAuthorizeValidatorService;
  const issuanceId = 'A'.repeat(48);
  const mptIssuanceId = signal(issuanceId);
  const existingMpts = signal([{ mpt_issuance_id: issuanceId, Flags: 0x00000004 }]);
  const authAction = signal<'authorize' | 'unauthorize'>('unauthorize');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MptStoreService,
          useValue: { mptIssuanceId, existingMpts, authAction },
        },
        { provide: MptUtilService, useValue: {} },
        { provide: XrplService, useValue: {} },
        { provide: WalletManagerService, useValue: { getSelectedWallet: () => null } },
      ],
    });
    service = TestBed.inject(MptAuthorizeValidatorService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should allow unauthorize for MPTs that require authorization', () => {
    expect(service.isActionAppropriateForMpt()).toBeTrue();
    expect(service.getActionErrorMessage()).toBe('');
    expect(service.getAllValidationErrors()).not.toContain('This MPT requires issuer authorization. Unauthorize is not available from the issuer side.');
  });
});
