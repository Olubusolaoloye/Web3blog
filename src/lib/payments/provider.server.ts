/** Payments (CLAUDE.md §7.12). Manual invoicing now; crypto (USDT) and Paystack/Flutterwave can implement this later. */
export interface InvoiceRequest {
  orderId?: string;
  packageCode: string;
  packageName: string;
  amountUsd: number;
  email: string;
  company?: string;
}

export interface Invoice {
  reference: string;
  /** Plain-language next steps shown to the customer and emailed to them. */
  instructions: string;
}

export interface PaymentProvider {
  readonly name: string;
  createInvoice(req: InvoiceRequest): Promise<Invoice>;
}

export class ManualInvoiceProvider implements PaymentProvider {
  readonly name = "manual-invoice";
  constructor(private readonly now: () => Date = () => new Date()) {}

  async createInvoice(req: InvoiceRequest): Promise<Invoice> {
    const d = this.now();
    const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
    const rand = crypto.getRandomValues(new Uint32Array(1))[0]!.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
    const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(req.amountUsd);
    return {
      reference: `INV-${stamp}-${rand}`,
      instructions: `We'll email an invoice for ${req.packageName} (${amount}) within one business day. Payment by bank transfer or USDT; we confirm dates and deliverables before you pay.`,
    };
  }
}
