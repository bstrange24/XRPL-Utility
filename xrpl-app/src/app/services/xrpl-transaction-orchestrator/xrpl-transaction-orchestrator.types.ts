import * as xrpl from 'xrpl';

export type TxOrchestratorMode = 'simulate' | 'submit';
export type TxOrchestratorResult = { success: true; mode: TxOrchestratorMode; hash?: string; tx: xrpl.Transaction; response: any } | { success: false; mode: TxOrchestratorMode; tx?: xrpl.Transaction; error: string; response?: any };

export interface TxOrchestratorUiOptions {
     suppressIndividualFeedback?: boolean;
     suppressPreview?: boolean;
}

export interface TxOrchestratorSigningOptions {
     useMultiSign?: boolean;
     multiSignAddress?: string;
     multiSignSeeds?: string;
     regularKeyAddress?: string;
     isRegularKeyAddress?: boolean;
     regularKeySeed?: string;
}

export interface TxOrchestratorContext {
     client: xrpl.Client;
     wallet: xrpl.Wallet;
     env: any;
     accountInfo?: any;
     accountObjects?: any;
     fee?: string;
     serverInfo?: any;
}

export interface ExecuteTxParams<TTx extends xrpl.Transaction = xrpl.Transaction> {
     client: xrpl.Client;
     wallet: xrpl.Wallet;
     env: any;
     mode: TxOrchestratorMode;
     skipBalanceCheck?: boolean;
     skipSigning?: boolean;
     preSignedTxBlob?: string;
     ui?: TxOrchestratorUiOptions;
     signing?: TxOrchestratorSigningOptions;
     buildTx: (ctx: TxOrchestratorContext) => Promise<TTx> | TTx;
     validate?: (ctx: TxOrchestratorContext, tx: TTx) => Promise<string[]> | string[];
}
