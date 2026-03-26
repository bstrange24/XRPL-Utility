import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrustlineIssueComponent } from './trustline-issue.component';

describe('TrustlineIssueComponent', () => {
  let component: TrustlineIssueComponent;
  let fixture: ComponentFixture<TrustlineIssueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrustlineIssueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrustlineIssueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
