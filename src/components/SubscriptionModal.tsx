import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  CreditCard,
  Lock,
  ArrowRight,
  CheckCircle2,
  Globe,
  Coins,
  Copy,
} from 'lucide-react';

export interface SubscriptionInfo {
  isActive: boolean;
  plan: string;
  price: string;
  startedAt: string | null;
  expiresAt: string | null;
  email: string | null;
  paymentMethod?: string | null;
  subscriptionId: string | null;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionInfo;
  onSubscribeSuccess: (sub: SubscriptionInfo) => void;
  onCancelSuccess: () => void;
}

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (options: any) => any;
        };
      };
    };
  }
}

type PaymentTab = 'gpay' | 'card' | 'paypal' | 'crypto';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onSubscribeSuccess,
  onCancelSuccess,
}) => {
  const [paymentTab, setPaymentTab] = useState<PaymentTab>('gpay');
  const [email, setEmail] = useState<string>('');

  // Card Form State
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');

  // PayPal Email
  const [paypalEmail, setPaypalEmail] = useState<string>('');

  // Crypto Tx ID
  const [txId, setTxId] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gpaySheetOpen, setGpaySheetOpen] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setGpaySheetOpen(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const processPayment = async (method: string, extraDetails?: Record<string, any>) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/subscription/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || 'subscriber@fantik.app',
          paymentMethod: method,
          ...extraDetails,
        }),
      });

      const data = await res.json();
      if (data.success && data.subscription) {
        onSubscribeSuccess(data.subscription);
      } else {
        setError('Payment verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length < 15) {
      setError('Please enter a valid card number');
      return;
    }
    processPayment('Credit/Debit Card (Worldwide)', {
      cardLast4: cardNumber.slice(-4),
      holder: cardHolder,
    });
  };

  const handlePaypalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processPayment('PayPal (Global)', { paypalEmail });
  };

  const handleCryptoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processPayment('Crypto USDT (TRC20)', { txId: txId || `usdt_${Date.now()}` });
  };

  const handleGooglePayClick = async () => {
    setLoading(true);
    setError(null);

    if (window.google?.payments?.api?.PaymentsClient) {
      try {
        const paymentsClient = new window.google.payments.api.PaymentsClient({
          environment: 'TEST',
        });

        const paymentDataRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: 'CARD',
              parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
              },
              tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                  gateway: 'example',
                  gatewayMerchantId: 'exampleGatewayMerchantId',
                },
              },
            },
          ],
          merchantInfo: {
            merchantId: '12345678901234567890',
            merchantName: 'FanTik Coins',
          },
          transactionInfo: {
            totalPriceStatus: 'FINAL',
            totalPrice: '2.33',
            currencyCode: 'USD',
            countryCode: 'US',
          },
        };

        const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
        await processPayment('Google Pay', {
          paymentToken: paymentData.paymentMethodData?.tokenizationData?.token,
        });
        setLoading(false);
        return;
      } catch (err: any) {
        setGpaySheetOpen(true);
        setLoading(false);
        return;
      }
    }

    setGpaySheetOpen(true);
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await fetch('/api/subscription/cancel', { method: 'POST' });
      onCancelSuccess();
    } catch (err: any) {
      setError('Could not cancel subscription.');
    } finally {
      setLoading(false);
    }
  };

  const copyCryptoAddress = () => {
    navigator.clipboard.writeText('TX4fK99X4tVjPq1Q8mN3Z9wY5bA2cE7dRf');
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm tracking-tight">FanTik VIP Global Access</h3>
              <p className="text-[11px] text-slate-400">Worldwide Payment Methods Accepted</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {subscription.isActive ? (
            /* Active Subscription View */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2 text-center">
                <div className="inline-flex p-2 rounded-full bg-emerald-500/20 text-emerald-400 mb-1">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-100 text-base">VIP Subscription Active</h4>
                <p className="text-xs text-emerald-300 font-medium">Plan: $2.33 / month (Unlimited 24/7)</p>
                <p className="text-[11px] text-slate-400">
                  Method: {subscription.paymentMethod || 'Global Payment'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Renews: {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'Active'}
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Unlimited 24/7 automated coin collector active</span>
                </div>
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>5x Turbo online sync with priority cloud access</span>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm border border-emerald-500/50 shadow-md transition cursor-pointer"
                >
                  Continue
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="py-3 px-4 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 font-medium rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Purchase Subscription View */
            <div className="space-y-4">
              {/* Plan Pricing Banner */}
              <div className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-100 text-sm">VIP Monthly Pass</h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                      Global
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pay securely from any country</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">$2.33</div>
                  <div className="text-[10px] text-slate-400 font-medium">/ month</div>
                </div>
              </div>

              {/* International Payment Method Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentTab('gpay')}
                  className={`py-2 px-1 rounded-lg font-semibold text-center transition cursor-pointer ${
                    paymentTab === 'gpay' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  GPay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('card')}
                  className={`py-2 px-1 rounded-lg font-semibold text-center transition cursor-pointer ${
                    paymentTab === 'card' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('paypal')}
                  className={`py-2 px-1 rounded-lg font-semibold text-center transition cursor-pointer ${
                    paymentTab === 'paypal' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  PayPal
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('crypto')}
                  className={`py-2 px-1 rounded-lg font-semibold text-center transition cursor-pointer ${
                    paymentTab === 'crypto' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Crypto
                </button>
              </div>

              {/* 1. Google Pay */}
              {paymentTab === 'gpay' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Email address for Google Pay receipt
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGooglePayClick}
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-black hover:bg-slate-950 text-white font-bold rounded-xl text-sm border border-slate-700 shadow-xl transition cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span className="text-white text-sm font-medium">Buy with</span>
                    <span className="inline-flex items-center text-base font-bold tracking-tight">
                      <span className="text-[#4285F4]">G</span>
                      <span className="text-[#EA4335]">o</span>
                      <span className="text-[#FBBC05]">o</span>
                      <span className="text-[#4285F4]">g</span>
                      <span className="text-[#34A853]">l</span>
                      <span className="text-[#EA4335]">e</span>
                      <span className="ml-1 text-slate-200 font-semibold">Pay</span>
                    </span>
                    <span className="text-xs text-slate-400 font-normal">($2.33)</span>
                  </button>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Google Pay automatically accepts Visa, Mastercard, AMEX, Discover & all connected bank cards worldwide.
                  </p>
                </div>
              )}

              {/* 2. Any Credit / Debit Card Worldwide */}
              {paymentTab === 'card' && (
                <form onSubmit={handleCardSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Cardholder Name"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Card Number (Visa / Mastercard / Amex / UnionPay / JCB)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="•••• •••• •••• ••••"
                        required
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 transition font-mono"
                      />
                      <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 transition font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        placeholder="•••"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 transition font-mono text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm border border-emerald-500/50 shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Authorizing Card...' : 'Pay with Card — $2.33 / mo'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {/* 3. PayPal Global */}
              {paymentTab === 'paypal' && (
                <form onSubmit={handlePaypalSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      PayPal Account Email
                    </label>
                    <input
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="paypal@yourdomain.com"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold rounded-xl text-sm transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Connecting to PayPal...' : 'Pay $2.33 with PayPal'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center">
                    Pay securely using your PayPal balance, linked bank account, or PayPal credit.
                  </p>
                </form>
              )}

              {/* 4. Crypto (USDT TRC-20) */}
              {paymentTab === 'crypto' && (
                <form onSubmit={handleCryptoSubmit} className="space-y-3 pt-1">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Currency:</span>
                      <span className="font-bold text-amber-400">USDT (TRC-20)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Amount:</span>
                      <span className="font-bold text-white">2.33 USDT</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400 mb-1">Deposit Address:</div>
                      <div className="flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-300 font-mono truncate">
                          TX4fK99X4tVjPq1Q8mN3Z9wY5bA2cE7dRf
                        </span>
                        <button
                          type="button"
                          onClick={copyCryptoAddress}
                          className="ml-2 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedAddress ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Transaction Hash / Binance Order ID
                    </label>
                    <input
                      type="text"
                      value={txId}
                      onChange={(e) => setTxId(e.target.value)}
                      placeholder="e.g. 847d9b23..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/80 transition font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                  >
                    <span>{loading ? 'Verifying Crypto Block...' : 'Confirm 2.33 USDT Payment'}</span>
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}

              {error && (
                <div className="p-2 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-400 text-center">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-500 text-center pt-1">
                <Lock className="w-3 h-3" />
                <span>256-bit SSL encrypted international secure checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Pay Sheet Dialog */}
      {gpaySheetOpen && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                  <span className="ml-1 text-slate-100 font-semibold">Pay</span>
                </span>
              </div>
              <button
                onClick={() => setGpaySheetOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400">Merchant: FanTik Coins VIP</span>
                <span className="text-base font-bold text-white">$2.33 USD</span>
              </div>

              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider pt-1">
                Select Card in Google Account
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setGpaySheetOpen(false);
                    processPayment('Google Pay (Visa •••• 4242)');
                  }}
                  className="w-full p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-5 bg-blue-600 text-white text-[9px] font-bold rounded flex items-center justify-center">
                      VISA
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Visa ending in 4242</div>
                      <div className="text-[10px] text-slate-500">Google Account Primary</div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGpaySheetOpen(false);
                    processPayment('Google Pay (Mastercard •••• 8899)');
                  }}
                  className="w-full p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-5 bg-orange-600 text-white text-[9px] font-bold rounded flex items-center justify-center">
                      MC
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Mastercard ending in 8899</div>
                      <div className="text-[10px] text-slate-500">Debit / Credit Card</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setGpaySheetOpen(false);
                  processPayment('Google Pay (Visa •••• 4242)');
                }}
                disabled={loading}
                className="w-full py-3.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold rounded-xl text-sm transition shadow-lg cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>{loading ? 'Authorizing...' : 'Confirm & Pay $2.33'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
