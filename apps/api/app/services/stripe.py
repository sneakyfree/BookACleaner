import Stripe from 'stripe'

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export interface CreatePaymentIntentParams {
  amount: number // in cents
  currency?: string
  customerId?: string
  metadata?: Record<string, string>
}

export interface CreateConnectedAccountParams {
  email: string
  businessName?: string
  country?: string
}

// Payment processing for clients
export async function createPaymentIntent({
  amount,
  currency = 'usd',
  customerId,
  metadata,
}: CreatePaymentIntentParams) {
  return stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

export async function confirmPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.confirm(paymentIntentId)
}

export async function capturePaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.capture(paymentIntentId)
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount, // If not provided, full refund
  })
}

// Customer management
export async function createCustomer(email: string, name?: string) {
  return stripe.customers.create({
    email,
    name,
  })
}

export async function attachPaymentMethod(customerId: string, paymentMethodId: string) {
  return stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })
}

export async function getCustomerPaymentMethods(customerId: string) {
  return stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  })
}

// Stripe Connect for cleaners (payouts)
export async function createConnectedAccount({
  email,
  businessName,
  country = 'US',
}: CreateConnectedAccountParams) {
  return stripe.accounts.create({
    type: 'express',
    email,
    country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: businessName,
    },
  })
}

export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
}

export async function getAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId)
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements,
  }
}

// Transfer money to cleaner after job completion
export async function createTransfer(
  amount: number, // in cents
  destinationAccountId: string,
  jobId: string
) {
  return stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: destinationAccountId,
    metadata: { jobId },
  })
}

// Webhooks
export function constructWebhookEvent(payload: Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

export { stripe }
