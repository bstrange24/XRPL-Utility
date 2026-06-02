export interface CurrencyState {
     currencyCode: string;
     currencyIssuer: string;
     lastCurrency: string;
     lastIssuer: string;
     userAddedissuerFields: string;
     newCurrency: string;
     newIssuer: string;
     issuerToRemove: string;
     currency: string;
     issuer: string;
     amount: number | null;
     balance: string;
     isIssuer: boolean;
     destination: string;
}
