import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MptCreateComponent } from './mpt-create.component';

describe('MptCreateComponent', () => {
  let component: MptCreateComponent;
  let fixture: ComponentFixture<MptCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MptCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MptCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
