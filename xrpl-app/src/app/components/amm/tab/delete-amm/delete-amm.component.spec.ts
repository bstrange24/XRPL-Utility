import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteAmmComponent } from './delete-amm.component';

describe('DeleteAmmComponent', () => {
  let component: DeleteAmmComponent;
  let fixture: ComponentFixture<DeleteAmmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteAmmComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteAmmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
