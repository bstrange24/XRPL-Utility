import { TestBed } from '@angular/core/testing';

import { TagValidatorService } from './tag-validator.service';

describe('TagValidatorService', () => {
  let service: TagValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TagValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
