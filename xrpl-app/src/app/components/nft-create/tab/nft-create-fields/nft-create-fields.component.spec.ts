import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftCreateFieldsComponent } from './nft-create-fields.component';

describe('NftCreateFieldsComponent', () => {
     let component: NftCreateFieldsComponent;
     let fixture: ComponentFixture<NftCreateFieldsComponent>;

     beforeEach(async () => {
          await TestBed.configureTestingModule({
               imports: [NftCreateFieldsComponent],
          }).compileComponents();

          fixture = TestBed.createComponent(NftCreateFieldsComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
     });

     it('should create', () => {
          expect(component).toBeTruthy();
     });
});
