import { Injectable, signal } from '@angular/core';
import { WalletGeneratorActionTypes } from '../../../components/wallet-configurator/constants/wallet-generator.types';

@Injectable({
     providedIn: 'root',
})
export class WalletsViewModelService {
     readonly activeTab = signal<WalletGeneratorActionTypes>('generate');
}
