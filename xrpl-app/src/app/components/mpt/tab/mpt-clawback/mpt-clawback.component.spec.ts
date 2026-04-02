import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MptClawbackComponent } from './mpt-clawback.component';

describe('MptClawbackComponent', () => {
  let component: MptClawbackComponent;
  let fixture: ComponentFixture<MptClawbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MptClawbackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MptClawbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
