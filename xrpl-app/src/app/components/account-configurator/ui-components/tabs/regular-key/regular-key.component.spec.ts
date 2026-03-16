import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegularKeyComponent } from './regular-key.component';

describe('RegularKeyComponent', () => {
  let component: RegularKeyComponent;
  let fixture: ComponentFixture<RegularKeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegularKeyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegularKeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
