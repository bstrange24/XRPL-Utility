import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteAccountSummaryComponent } from './delete-account-summary.component';

describe('DeleteAccountSummaryComponent', () => {
  let component: DeleteAccountSummaryComponent;
  let fixture: ComponentFixture<DeleteAccountSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteAccountSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteAccountSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
