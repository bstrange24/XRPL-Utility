import { TestBed } from '@angular/core/testing';

import { DownloadUtilService } from './download-util.service';

describe('DownloadUtilService', () => {
  let service: DownloadUtilService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DownloadUtilService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
