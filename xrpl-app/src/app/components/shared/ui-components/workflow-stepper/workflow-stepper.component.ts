import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type WorkflowPage = 'vault' | 'broker' | 'loan';

interface WorkflowStep {
     page: WorkflowPage;
     title: string;
     route: string;
     actions: string;
     hint: string;
}

const STEPS: WorkflowStep[] = [
     {
          page: 'vault',
          title: '1. Vault',
          route: '/vault',
          actions: 'Create a Closed-ended vault, then Deposit assets before the Subscription Date.',
          hint: 'Loan brokers can only attach to Closed-ended vaults. Deposits are accepted only before the Subscription Date; the Redemption Date must be at least 180 seconds later.',
     },
     {
          page: 'broker',
          title: '2. Loan Broker',
          route: '/loan-broker',
          actions: 'Create a Loan Broker on your vault, set Debt Maximum, and Deposit first-loss cover.',
          hint: 'Debt Maximum (in drops for XRP) must be at least the largest loan principal. Cover Rate Minimum and Liquidation must both be zero or both non-zero.',
     },
     {
          page: 'loan',
          title: '3. Loan',
          route: '/loan',
          actions: 'Create a Loan (needs the borrower as counterparty), then Pay and Delete it when repaid.',
          hint: 'The borrower must co-sign Loan Create, so the counterparty seed is required. The vault needs enough available liquidity for the principal.',
     },
];

const TAB_HINTS: Record<string, string> = {
     createVault: 'Pick Closed-ended if you plan to attach a Loan Broker. Next: Deposit into the vault.',
     depositVault: 'Deposit before the Subscription Date. Next: go to the Loan Broker page.',
     modifyVault: 'Only Data and Assets Maximum can be changed.',
     clawbackVault: 'Only works for issued tokens where you are the issuer; XRP cannot be clawed back.',
     deleteVault: 'The vault must be empty (withdraw all assets) and have no Loan Broker.',
     createBroker: 'Select one of your Closed-ended vaults. Next: Cover Deposit, and raise Debt Maximum if needed.',
     modifyBroker: 'Only Data and Debt Maximum can be changed (Debt Maximum cannot be set to 0).',
     coverDeposit: 'Deposit first-loss capital. Loans need cover of at least the Cover Rate Minimum.',
     coverWithdraw: 'You can only withdraw up to the available cover and not below what active loans require.',
     coverClawback: 'Only for issued tokens; XRP cannot be clawed back.',
     deleteBroker: 'Withdraw remaining cover and close all loans first.',
     impairLoan: 'Marks a loan as impaired so losses are recognised early.',
     unimpairLoan: 'Reverts an impaired loan to normal.',
     defaultLoan: 'Defaults a loan after its grace period has passed.',
     modifyLoan: 'XRPL has no loan edit; use Impair, Unimpair or Default instead.',
     createLoan: 'Requires an existing Loan Broker and the borrower seed. Principal must not exceed Debt Maximum.',
     payLoan: 'Pay installments on an active loan.',
     deleteLoan: 'Only possible after the loan is fully repaid or defaulted.',
};

@Component({
     selector: 'app-workflow-stepper',
     imports: [RouterLink],
     changeDetection: ChangeDetectionStrategy.OnPush,
     template: `
          <div class="card-base-sm mb-3">
               <div class="flex items-center justify-between">
                    <h4 class="section-heading-xs !mb-0">Lending workflow: Vault → Loan Broker → Loan</h4>
                    <button type="button" class="text-xs font-medium text-gray-500 hover:text-gray-700" (click)="open.set(!open())">{{ open() ? 'Hide steps' : 'Show steps' }}</button>
               </div>
               @if (open()) {
               <ol class="mt-3 grid gap-3 md:grid-cols-3">
                    @for (step of steps; track step.page) {
                    <li class="rounded-2xl border p-4" [class.border-blue-500]="step.page === page()" [class.bg-blue-50]="step.page === page()" [class.border-gray-200]="step.page !== page()" [class.bg-gray-50]="step.page !== page()" [attr.aria-current]="step.page === page() ? 'step' : null">
                         <div class="flex items-center justify-between">
                              <a [routerLink]="step.route" class="text-sm font-semibold text-gray-900 hover:underline">{{ step.title }}</a>
                              @if (step.page === page()) {
                              <span class="text-xs font-medium text-blue-600">You are here</span>
                              }
                         </div>
                         <p class="mt-1 text-sm text-gray-700">{{ step.actions }}</p>
                         <p class="mt-1 text-xs text-gray-500">{{ step.hint }}</p>
                    </li>
                    }
               </ol>
               }
               @if (tabHint()) {
               <p class="mt-3 text-xs text-gray-600"><span class="font-semibold text-gray-700">Tip:</span> {{ tabHint() }}</p>
               }
          </div>
     `,
})
export class WorkflowStepperComponent {
     readonly page = input.required<WorkflowPage>();
     readonly activeTab = input<string>('');
     readonly steps = STEPS;
     readonly open = signal(true);
     readonly tabHint = computed(() => TAB_HINTS[this.activeTab()] ?? '');
}
