declare module '@cashfreepayments/cashfree-js' {
  interface CheckoutOptions {
    paymentSessionId: string;
    redirectTarget?: string;
  }
  interface CashfreeInstance {
    checkout(options: CheckoutOptions): void;
  }
  export function load(options: { mode: string }): Promise<CashfreeInstance>;
}
