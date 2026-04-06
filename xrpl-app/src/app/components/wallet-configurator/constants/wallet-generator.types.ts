export type WalletGeneratorActionTypes = 'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets';
export type WalletGeneratorTxType = 'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets';
export type WalletGeneratorTab = 'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets';
export type WalletGeneratorTxTypeFull = 'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets';
export type WalletGeneratorConfigTxDisplayType = 'generate' | 'deriveSeed' | 'deriveMnemonic' | 'deriveSecretNumbers' | 'removeCustomWallets';
export type IconType = 'ng-icon' | 'lucide-icon';

export type ButtonLoadingState = {
     generateNewWalletFromSeed: boolean;
     generateNewWalletFromMnemonic: boolean;
     generateNewWalletFromSecretNumbers: boolean;
     deriveWalletFromFamilySeed: boolean;
     deriveWalletFromMnemonic: boolean;
     deriveWalletFromSecretNumbers: boolean;
};

export interface WalletFlowConfig {
     perfLabel: string;
     loadingKey: keyof ButtonLoadingState;
     walletType: 'familySeed' | 'mnemonic' | 'secretNumbers';
     mode: 'generate' | 'import';
     input?: () => string | string[];
     validate?: () => string | null;
     successMessage: (address: string) => string;
}
