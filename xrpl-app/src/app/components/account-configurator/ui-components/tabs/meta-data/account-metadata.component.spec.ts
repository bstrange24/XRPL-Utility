import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountMetadataComponent } from './account-metadata.component';

describe('AccountMetadataComponent', () => {
  let component: AccountMetadataComponent;
  let fixture: ComponentFixture<AccountMetadataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountMetadataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountMetadataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
