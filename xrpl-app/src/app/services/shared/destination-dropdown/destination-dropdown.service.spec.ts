import { TestBed } from '@angular/core/testing';

import { DestinationDropdownService } from './destination-dropdown.service';

describe('DestinationDropdownService', () => {
  let service: DestinationDropdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DestinationDropdownService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
