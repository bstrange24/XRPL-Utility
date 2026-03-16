import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiSignComponent } from './multi-sign.component';

describe('MultiSignComponent', () => {
  let component: MultiSignComponent;
  let fixture: ComponentFixture<MultiSignComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSignComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiSignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
