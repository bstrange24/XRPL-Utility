import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpirationFilterInputComponent } from './expiration-filter-input.component';

describe('ExpirationFilterInputComponent', () => {
  let component: ExpirationFilterInputComponent;
  let fixture: ComponentFixture<ExpirationFilterInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpirationFilterInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpirationFilterInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
