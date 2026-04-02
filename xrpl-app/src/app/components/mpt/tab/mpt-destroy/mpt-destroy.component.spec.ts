import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MptDestroyComponent } from './mpt-destroy.component';

describe('MptDestroyComponent', () => {
  let component: MptDestroyComponent;
  let fixture: ComponentFixture<MptDestroyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MptDestroyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MptDestroyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
