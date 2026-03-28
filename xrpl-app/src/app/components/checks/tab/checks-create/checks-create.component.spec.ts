import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChecksCreateComponent } from './checks-create.component';

describe('ChecksCreateComponent', () => {
  let component: ChecksCreateComponent;
  let fixture: ComponentFixture<ChecksCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChecksCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChecksCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
