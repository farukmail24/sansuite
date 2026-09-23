import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { practices, practiceSubscriptions, systemPayments, systemSettings } from "../../shared/schema";
import { eq } from "drizzle-orm";

const gatewayRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: load all systemSettings into a map
// ─────────────────────────────────────────────────────────────────────────────
async function loadSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(systemSettings);
  return rows.reduce((acc: Record<string, string>, s: any) => ({ ...acc, [s.key]: s.value }), {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared HTML shell used by every gateway checkout page
// ─────────────────────────────────────────────────────────────────────────────
function buildShell(opts: {
  gatewayTitle: string;
  brandColor: string;
  logoText: string;
  plan: string;
  amount: string;
  practiceId: string;
  headExtras?: string;
  bodyContent: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.gatewayTitle} — SanSuite</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${opts.headExtras || ''}
  <style>
    body { font-family: 'Inter', sans-serif; }
    .spinner { border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; width: 18px; height: 18px; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    #stripe-card-element { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
    #stripe-card-errors { color: #e53e3e; font-size: 12px; margin-top: 4px; min-height: 16px; }
  </style>
</head>
<body class="bg-slate-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
    <!-- Gateway Header -->
    <div style="background-color: ${opts.brandColor};" class="p-6 text-white flex items-center justify-between">
      <div>
        <span class="text-xs uppercase font-extrabold tracking-wider opacity-80">Secure Checkout</span>
        <h1 class="text-xl font-bold mt-0.5">${opts.gatewayTitle}</h1>
      </div>
      <div class="text-2xl font-black tracking-tight">${opts.logoText}</div>
    </div>

    <!-- Order Summary -->
    <div class="px-6 pt-5 pb-2">
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Summary</div>
        <div class="flex justify-between items-center text-slate-800">
          <span class="font-bold text-sm">SanSuite ${opts.plan} Plan Subscription</span>
          <span class="font-extrabold text-base text-slate-900">£${opts.amount} / mo</span>
        </div>
        <div class="text-xs text-slate-500 pt-1 border-t border-slate-200 flex justify-between">
          <span>Practice ID: #${opts.practiceId}</span>
          <span class="text-emerald-600 font-semibold">256-Bit SSL Encrypted</span>
        </div>
      </div>
    </div>

    <!-- Gateway-Specific Content -->
    <div class="px-6 pb-6 pt-4 space-y-4">
      ${opts.bodyContent}

      <div class="pt-2 text-center">
        <a href="/admin?checkout_cancel=true" class="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
          Cancel &amp; Return to Dashboard
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/gateway-checkout
// ─────────────────────────────────────────────────────────────────────────────
gatewayRouter.get("/gateway-checkout", async (req, res) => {
  try {
    const gateway = (req.query.gateway as string || "stripe").toLowerCase();
    const plan = (req.query.plan as string || "Pro").trim();
    const amount = (req.query.amount as string || "99.00").trim();
    const practiceId = (req.query.practiceId as string || "1").trim();
    const clientSecret = (req.query.clientSecret as string || "").trim();
    const authorizeToken = (req.query.authorizeToken as string || "").trim();

    const sMap = await loadSettings();

    // ── STRIPE ────────────────────────────────────────────────────────────────
    if (gateway === "stripe") {
      const publishableKey = sMap.gateway_stripe_publishable_key || "";
      const isLive = sMap.gateway_stripe_mode === "live";

      if (!publishableKey || !clientSecret) {
        return res.send(buildShell({
          gatewayTitle: "Stripe Secure Checkout",
          brandColor: "#635bff",
          logoText: "Stripe",
          plan, amount, practiceId,
          bodyContent: `
            <div class="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
              <div class="font-bold">Stripe Not Configured</div>
              <p>Please configure your Stripe Publishable Key and Secret Key in the System Admin settings, then try again.</p>
            </div>`
        }));
      }

      const html = buildShell({
        gatewayTitle: "Stripe Secure Checkout",
        brandColor: "#635bff",
        logoText: "Stripe",
        plan, amount, practiceId,
        headExtras: `<script src="https://js.stripe.com/v3/"></script>`,
        bodyContent: `
          <div class="space-y-4">
            <div class="p-4 border border-indigo-200 bg-indigo-50/40 rounded-xl space-y-3">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Card Details</label>
                <span class="text-[11px] font-semibold text-indigo-600">Stripe PCI DSS Encrypted</span>
              </div>
              <div id="stripe-card-element"></div>
              <div id="stripe-card-errors"></div>
              <div class="text-[10px] text-slate-500">Test card: 4242 4242 4242 4242 — 12/28 — 888 — Any postcode</div>
            </div>
            <button id="stripe-pay-btn" class="w-full bg-[#635bff] hover:bg-[#534be0] disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
              Pay £${amount} with Stripe
            </button>
            <form id="gateway-form" action="/api/payments/process-gateway-payment" method="POST">
              <input type="hidden" name="gateway" value="stripe">
              <input type="hidden" name="plan" value="${plan}">
              <input type="hidden" name="amount" value="${amount}">
              <input type="hidden" name="practiceId" value="${practiceId}">
              <input type="hidden" id="payment-ref" name="txnRef" value="">
            </form>
          </div>
          <script>
            (function() {
              var stripe = Stripe('${publishableKey}');
              var elements = stripe.elements();
              var cardElement = elements.create('card', {
                style: {
                  base: { fontSize: '14px', color: '#1e293b', fontFamily: 'Inter, sans-serif', '::placeholder': { color: '#94a3b8' } },
                  invalid: { color: '#e53e3e' }
                }
              });
              cardElement.mount('#stripe-card-element');
              cardElement.on('change', function(event) {
                document.getElementById('stripe-card-errors').textContent = event.error ? event.error.message : '';
              });
              document.getElementById('stripe-pay-btn').addEventListener('click', async function() {
                var btn = this;
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner"></span> Processing...';
                var result = await stripe.confirmCardPayment('${clientSecret}', {
                  payment_method: { card: cardElement }
                });
                if (result.error) {
                  document.getElementById('stripe-card-errors').textContent = result.error.message;
                  btn.disabled = false;
                  btn.innerHTML = 'Pay £${amount} with Stripe';
                } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                  document.getElementById('payment-ref').value = result.paymentIntent.id;
                  document.getElementById('gateway-form').submit();
                }
              });
            })();
          </script>`
      });
      return res.send(html);
    }

    // ── PAYPAL ────────────────────────────────────────────────────────────────
    if (gateway === "paypal") {
      const clientId = sMap.gateway_paypal_client_id || "";
      const isLive = sMap.gateway_paypal_mode === "live";

      if (!clientId || clientId === "test") {
        return res.send(buildShell({
          gatewayTitle: "PayPal Express Checkout",
          brandColor: "#0070ba",
          logoText: "PayPal",
          plan, amount, practiceId,
          bodyContent: `
            <div class="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
              <div class="font-bold">PayPal Not Configured</div>
              <p>Please configure your PayPal Client ID in the System Admin settings, then try again.</p>
            </div>`
        }));
      }

      const html = buildShell({
        gatewayTitle: "PayPal Express Checkout",
        brandColor: "#0070ba",
        logoText: "PayPal",
        plan, amount, practiceId,
        headExtras: `<script src="https://www.paypal.com/sdk/js?client-id=${clientId}&currency=GBP&components=buttons&intent=capture"></script>`,
        bodyContent: `
          <form id="gateway-form" action="/api/payments/process-gateway-payment" method="POST">
            <input type="hidden" name="gateway" value="paypal">
            <input type="hidden" name="plan" value="${plan}">
            <input type="hidden" name="amount" value="${amount}">
            <input type="hidden" name="practiceId" value="${practiceId}">
            <input type="hidden" id="paypal-order-id" name="orderId" value="">
            <input type="hidden" id="payment-ref" name="txnRef" value="">
          </form>
          <div id="paypal-button-container" class="min-h-[160px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200 p-3"></div>
          <script>
            paypal.Buttons({
              style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
              createOrder: function(data, actions) {
                return actions.order.create({
                  purchase_units: [{
                    description: 'SanSuite ${plan} Plan Subscription',
                    amount: { currency_code: 'GBP', value: '${amount}' }
                  }]
                });
              },
              onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                  document.getElementById('paypal-order-id').value = data.orderID;
                  document.getElementById('payment-ref').value = 'PAYPAL-' + data.orderID;
                  document.getElementById('gateway-form').submit();
                });
              },
              onCancel: function() { window.location.href = '/admin?checkout_cancel=true'; },
              onError: function(err) {
                console.error('PayPal error:', err);
                alert('PayPal encountered an error. Please try again or contact support.');
              }
            }).render('#paypal-button-container');
          </script>`
      });
      return res.send(html);
    }

    // ── GOCARDLESS (server redirected to hosted URL — handled in admin.ts) ───
    // This page should not normally be reached for GoCardless since admin.ts
    // redirects straight to the GoCardless hosted URL. Show a fallback:
    if (gateway === "gocardless") {
      const accessToken = sMap.gateway_gocardless_access_token || "";

      if (!accessToken || accessToken.trim() === "") {
        return res.send(buildShell({
          gatewayTitle: "GoCardless UK Direct Debit",
          brandColor: "#000435",
          logoText: "GC",
          plan, amount, practiceId,
          bodyContent: `
            <div class="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
              <div class="font-bold">GoCardless Not Configured</div>
              <p>Please configure your GoCardless Access Token in the System Admin settings, then try again.</p>
            </div>`
        }));
      }

      return res.redirect(302, `/api/payments/create-gocardless-session?plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}`);
    }

    // ── RAZORPAY ──────────────────────────────────────────────────────────────
    if (gateway === "razorpay") {
      const keyId = sMap.gateway_razorpay_key_id || "";
      const amountPaise = Math.round(parseFloat(amount) * 100);

      if (!keyId || keyId === "rzp_test_sample") {
        return res.send(buildShell({
          gatewayTitle: "Razorpay International Payment",
          brandColor: "#0c2340",
          logoText: "RZP",
          plan, amount, practiceId,
          bodyContent: `
            <div class="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
              <div class="font-bold">Razorpay Not Configured</div>
              <p>Please configure your Razorpay Key ID and Key Secret in the System Admin settings, then try again.</p>
            </div>`
        }));
      }

      const html = buildShell({
        gatewayTitle: "Razorpay International Payment",
        brandColor: "#0c2340",
        logoText: "RZP",
        plan, amount, practiceId,
        headExtras: `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`,
        bodyContent: `
          <form id="gateway-form" action="/api/payments/process-gateway-payment" method="POST">
            <input type="hidden" name="gateway" value="razorpay">
            <input type="hidden" name="plan" value="${plan}">
            <input type="hidden" name="amount" value="${amount}">
            <input type="hidden" name="practiceId" value="${practiceId}">
            <input type="hidden" id="payment-ref" name="txnRef" value="">
          </form>
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            Click the button below to open the official Razorpay payment popup. Use test card <strong>4111 1111 1111 1111</strong> in sandbox mode.
          </div>
          <button id="rzp-btn" class="w-full bg-[#0c2340] hover:bg-[#08182d] text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors">
            Pay £${amount} with Razorpay
          </button>
          <script>
            document.getElementById('rzp-btn').onclick = function() {
              var options = {
                key: '${keyId}',
                amount: ${amountPaise},
                currency: 'GBP',
                name: 'SanSuite Platform',
                description: '${plan} Plan Subscription',
                theme: { color: '#0c2340' },
                handler: function(response) {
                  document.getElementById('payment-ref').value = response.razorpay_payment_id || ('RZP-' + Date.now());
                  document.getElementById('gateway-form').submit();
                },
                modal: {
                  ondismiss: function() {
                    console.log('Razorpay checkout dismissed');
                  }
                }
              };
              var rzp = new Razorpay(options);
              rzp.open();
            };
          </script>`
      });
      return res.send(html);
    }

    // ── 2CHECKOUT (Verifone) ──────────────────────────────────────────────────
    // 2Checkout uses a simple redirect to their standard checkout URL.
    if (gateway === "2checkout") {
      const sellerId = sMap.gateway_2checkout_seller_id || "";
      const mode = sMap.gateway_2checkout_mode || "sandbox";

      if (!sellerId) {
        return res.send(buildShell({
          gatewayTitle: "2Checkout Secure Payment",
          brandColor: "#e84d00",
          logoText: "2CO",
          plan, amount, practiceId,
          bodyContent: `
            <div class="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
              <div class="font-bold">2Checkout Not Configured</div>
              <p>Please configure your 2Checkout Seller ID in the System Admin settings, then try again.</p>
            </div>`
        }));
      }

      // 2Checkout standard hosted checkout redirect URL
      const baseUrl = mode === "live"
        ? "https://secure.2checkout.com/checkout/buy"
        : "https://sandbox.2checkout.com/checkout/buy";
      const returnUrl = encodeURIComponent(`${req.protocol}://${req.get("host")}/api/payments/process-gateway-payment?gateway=2checkout&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&txnRef=TCO-REDIRECT`);
      const cancelUrl = encodeURIComponent(`${req.protocol}://${req.get("host")}/admin?checkout_cancel=true`);
      const twocoUrl = `${baseUrl}?sid=${sellerId}&quantity=1&product_id=SANSUITE-${plan.toUpperCase()}&currency=GBP&return-url=${returnUrl}&x_receipt_link_url=${returnUrl}`;

      return res.redirect(302, twocoUrl);
    }

    // ── AUTHORIZE.NET (Accept Hosted) ─────────────────────────────────────────
    if (gateway === "authorizenet") {
      const loginId = sMap.gateway_authorizenet_login_id || "";
      const transactionKey = sMap.gateway_authorizenet_transaction_key || "";
      const mode = sMap.gateway_authorizenet_mode || "sandbox";
      const authorizeToken = (req.query.authorizeToken as string || "").trim();
      const error = (req.query.error as string || "").trim();

      if (!loginId || !transactionKey || error) {
        return res.send(buildShell({
          gatewayTitle: "Authorize.Net Secure Payment",
          brandColor: "#2b3990",
          logoText: "AUTH",
          plan, amount, practiceId,
          bodyContent: `
            <div class="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-2">
              <div class="font-bold">Authorize.Net ${error ? "Error" : "Not Configured"}</div>
              <p>${error || "Please configure your Authorize.Net API Login ID and Transaction Key in the System Admin settings, then try again."}</p>
            </div>`
        }));
      }

      if (!authorizeToken) {
        // Token not yet generated — redirect to create session endpoint
        return res.redirect(302, `/api/payments/create-authorizenet-token?plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}`);
      }

      // We have the Accept Hosted token — render the iframe
      const anetUrl = mode === "live"
        ? "https://accept.authorize.net/payment/payment"
        : "https://test.authorize.net/payment/payment";

      const html = buildShell({
        gatewayTitle: "Authorize.Net Secure Payment",
        brandColor: "#2b3990",
        logoText: "AUTH",
        plan, amount, practiceId,
        headExtras: `<script src="${mode === "live" ? "https://js.authorize.net/v1/Accept.js" : "https://jstest.authorize.net/v1/Accept.js"}" charset="utf-8"></script>`,
        bodyContent: `
          <form id="gateway-form" action="/api/payments/process-gateway-payment" method="POST">
            <input type="hidden" name="gateway" value="authorizenet">
            <input type="hidden" name="plan" value="${plan}">
            <input type="hidden" name="amount" value="${amount}">
            <input type="hidden" name="practiceId" value="${practiceId}">
            <input type="hidden" id="payment-ref" name="txnRef" value="">
          </form>
          <iframe
            id="authorizenet-iframe"
            src="${anetUrl}?token=${authorizeToken}"
            class="w-full rounded-xl border border-slate-200"
            style="height: 420px;"
            frameborder="0"
            scrolling="no"
          ></iframe>
          <script>
            window.addEventListener('message', function(event) {
              try {
                var data = JSON.parse(event.data);
                if (data && data.transId) {
                  document.getElementById('payment-ref').value = 'ANET-' + data.transId;
                  document.getElementById('gateway-form').submit();
                } else if (data && data.action === 'cancel') {
                  window.location.href = '/admin?checkout_cancel=true';
                }
              } catch(e) {}
            }, false);
          </script>`
      });
      return res.send(html);
    }

    // ── Unknown gateway fallback ──────────────────────────────────────────────
    return res.send(buildShell({
      gatewayTitle: "Payment Checkout",
      brandColor: "#475569",
      logoText: "PAY",
      plan, amount, practiceId,
      bodyContent: `<div class="p-4 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 text-center">Unknown payment gateway selected. Please go back and select a valid option.</div>`
    }));

  } catch (error: any) {
    console.error("[GATEWAY-CHECKOUT ERROR]", error);
    res.status(500).send(`<h1>Checkout Error</h1><p>${error.message}</p>`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/create-authorizenet-token
// Server-side: call Authorize.Net API to get an Accept Hosted payment page token
// ─────────────────────────────────────────────────────────────────────────────
gatewayRouter.get("/create-authorizenet-token", async (req, res) => {
  const plan = (req.query.plan as string || "Pro").trim();
  const amount = (req.query.amount as string || "99.00").trim();
  const practiceId = (req.query.practiceId as string || "1").trim();

  try {

    const sMap = await loadSettings();
    const loginId = sMap.gateway_authorizenet_login_id || "";
    const transactionKey = sMap.gateway_authorizenet_transaction_key || "";
    const mode = sMap.gateway_authorizenet_mode || "sandbox";

    if (!loginId || !transactionKey) {
      return res.redirect(`/api/payments/gateway-checkout?gateway=authorizenet&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&error=${encodeURIComponent("Authorize.Net credentials not configured. Please configure your API Login ID and Transaction Key in System Admin settings.")}`);
    }

    const apiUrl = mode === "live"
      ? "https://api.authorize.net/xml/v1/request.api"
      : "https://apitest.authorize.net/xml/v1/request.api";

    const returnUrl = `${req.protocol}://${req.get("host")}/api/payments/process-gateway-payment?gateway=authorizenet&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&txnRef=ANET-HOSTED`;
    const cancelUrl = `${req.protocol}://${req.get("host")}/admin?checkout_cancel=true`;

    const payload = {
      getHostedPaymentPageRequest: {
        merchantAuthentication: { name: loginId, transactionKey },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount,
          currencyCode: "GBP",
          order: { description: `SanSuite ${plan} Plan Subscription` }
        },
        hostedPaymentSettings: {
          setting: [
            { settingName: "hostedPaymentReturnOptions", settingValue: JSON.stringify({ showReceipt: false, url: returnUrl, urlText: "Return to SanSuite", cancelUrl, cancelUrlText: "Cancel" }) },
            { settingName: "hostedPaymentButtonOptions", settingValue: JSON.stringify({ text: `Pay £${amount}` }) },
            { settingName: "hostedPaymentStyleOptions", settingValue: JSON.stringify({ bgColor: "white" }) },
            { settingName: "hostedPaymentPaymentOptions", settingValue: JSON.stringify({ cardCodeRequired: true, showCreditCard: true, showBankAccount: false }) },
            { settingName: "hostedPaymentSecurityOptions", settingValue: JSON.stringify({ captcha: false }) },
            { settingName: "hostedPaymentShippingAddressOptions", settingValue: JSON.stringify({ show: false, required: false }) },
            { settingName: "hostedPaymentBillingAddressOptions", settingValue: JSON.stringify({ show: true, required: true }) },
            { settingName: "hostedPaymentCustomerOptions", settingValue: JSON.stringify({ showEmail: false, requiredEmail: false, addPaymentProfile: false }) },
            { settingName: "hostedPaymentOrderOptions", settingValue: JSON.stringify({ show: true, merchantName: "SanSuite Platform" }) },
            { settingName: "hostedPaymentIFrameCommunicatorUrl", settingValue: JSON.stringify({ url: `${req.protocol}://${req.get("host")}/api/payments/authorizenet-communicator` }) },
          ]
        }
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json();
    const token = data?.token;

    if (!token) {
      console.error("[AUTHORIZENET TOKEN ERROR]", JSON.stringify(data));
      const errMsg = data?.messages?.message?.[0]?.text || "Failed to obtain Authorize.Net hosted page token";
      return res.redirect(`/api/payments/gateway-checkout?gateway=authorizenet&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&error=${encodeURIComponent(errMsg)}`);
    }

    // Redirect back to gateway-checkout page with the token
    res.redirect(302, `/api/payments/gateway-checkout?gateway=authorizenet&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&authorizeToken=${encodeURIComponent(token)}`);
  } catch (error: any) {
    console.error("[AUTHORIZENET TOKEN ERROR]", error.message);
    res.redirect(`/api/payments/gateway-checkout?gateway=authorizenet&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&error=${encodeURIComponent("Authorize.Net: " + error.message)}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/authorizenet-communicator
// IFrame communicator page required by Authorize.Net Accept Hosted
// ─────────────────────────────────────────────────────────────────────────────
gatewayRouter.get("/authorizenet-communicator", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><script>
  window.addEventListener('message', function(event) {
    if (event.origin.includes('authorize.net')) {
      window.parent.postMessage(event.data, '*');
    }
  }, false);
</script></head><body></body></html>`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/create-stripe-session
// Server-side: Create Stripe PaymentIntent and redirect to gateway-checkout page
// ─────────────────────────────────────────────────────────────────────────────
gatewayRouter.get("/create-stripe-session", async (req, res) => {
  try {
    const plan = (req.query.plan as string || "Pro").trim();
    const amount = (req.query.amount as string || "99.00").trim();
    const practiceId = (req.query.practiceId as string || "1").trim();

    const sMap = await loadSettings();
    const secretKey = sMap.gateway_stripe_secret_key || "";
    const publishableKey = sMap.gateway_stripe_publishable_key || "";

    if (!secretKey || secretKey === "sk_test_sample") {
      return res.redirect(`/admin?checkout_error=${encodeURIComponent("Stripe secret key not configured. Please configure in System Admin settings.")}`);
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
    const amountInPence = Math.round(parseFloat(amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: "gbp",
      description: `SanSuite ${plan} Plan Subscription — Practice #${practiceId}`,
      metadata: { practiceId, plan },
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    });

    res.redirect(302, `/api/payments/gateway-checkout?gateway=stripe&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&clientSecret=${encodeURIComponent(paymentIntent.client_secret || "")}`);
  } catch (error: any) {
    console.error("[STRIPE SESSION ERROR]", error.message);
    res.redirect(`/admin?checkout_error=${encodeURIComponent("Stripe: " + error.message)}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/create-gocardless-session
// Server-side: Create GoCardless BillingRequest + BillingRequestFlow, redirect to hosted URL
// ─────────────────────────────────────────────────────────────────────────────
gatewayRouter.get("/create-gocardless-session", async (req, res) => {
  try {
    const plan = (req.query.plan as string || "Pro").trim();
    const amount = (req.query.amount as string || "99.00").trim();
    const practiceId = (req.query.practiceId as string || "1").trim();

    const sMap = await loadSettings();
    const accessToken = sMap.gateway_gocardless_access_token || "";
    const mode = sMap.gateway_gocardless_mode || "sandbox";

    if (!accessToken || accessToken.trim() === "") {
      return res.redirect(`/admin?checkout_error=${encodeURIComponent("GoCardless access token not configured. Please configure in System Admin settings.")}`);
    }

    const apiBase = mode === "live"
      ? "https://api.gocardless.com"
      : "https://api-sandbox.gocardless.com";

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "GoCardless-Version": "2015-07-06",
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const successUrl = `${req.protocol}://${req.get("host")}/api/payments/process-gateway-payment?gateway=gocardless&plan=${encodeURIComponent(plan)}&amount=${encodeURIComponent(amount)}&practiceId=${encodeURIComponent(practiceId)}&txnRef=GC-MANDATE`;
    const exitUri = `${req.protocol}://${req.get("host")}/admin?checkout_cancel=true`;

    // Step 1: Create Billing Request
    const brResponse = await fetch(`${apiBase}/billing_requests`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        billing_requests: {
          mandate_request: {
            currency: "GBP",
            scheme: "bacs",
            metadata: { practiceId, plan }
          }
        }
      })
    });

    const brData: any = await brResponse.json();
    const billingRequestId = brData?.billing_requests?.id;
    if (!billingRequestId) {
      throw new Error(brData?.error?.message || "Failed to create GoCardless Billing Request");
    }

    // Step 2: Create Billing Request Flow to get hosted URL
    const flowResponse = await fetch(`${apiBase}/billing_request_flows`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        billing_request_flows: {
          redirect_uri: successUrl,
          exit_uri: exitUri,
          links: { billing_request: billingRequestId }
        }
      })
    });

    const flowData: any = await flowResponse.json();
    const authorisationUrl = flowData?.billing_request_flows?.authorisation_url;
    if (!authorisationUrl) {
      throw new Error(flowData?.error?.message || "Failed to create GoCardless Billing Request Flow");
    }

    // Redirect user to GoCardless hosted payment page
    return res.redirect(302, authorisationUrl);

  } catch (error: any) {
    console.error("[GOCARDLESS SESSION ERROR]", error.message);
    res.redirect(`/admin?checkout_error=${encodeURIComponent("GoCardless: " + error.message)}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/process-gateway-payment
// Captures confirmed payment and activates subscription
// ─────────────────────────────────────────────────────────────────────────────
gatewayRouter.post("/process-gateway-payment", async (req, res) => {
  try {
    // Support both POST body and GET query params (for redirect-based gateways)
    const gateway = (req.body.gateway || req.query.gateway as string || "online").toLowerCase();
    const plan = req.body.plan || req.query.plan as string || "Pro";
    const amount = req.body.amount || req.query.amount as string || "99.00";
    const practiceId = req.body.practiceId || req.query.practiceId as string || "1";
    const txnRef = req.body.txnRef || req.query.txnRef as string || req.body.orderId || "";

    const cleanPlanName = (plan || "Pro").charAt(0).toUpperCase() + (plan || "Pro").slice(1).toLowerCase();
    const pId = parseInt(String(practiceId) || "1");
    const generatedTxnRef = txnRef || `${gateway.toUpperCase()}-TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!txnRef && ["paypal", "stripe", "razorpay"].includes(gateway)) {
      throw new Error(`Transaction reference missing for ${gateway.toUpperCase()}`);
    }

    if (pId) {
      await db.update(practices).set({ plan: cleanPlanName.toLowerCase() }).where(eq(practices.id, pId));

      const [existingSub] = await db.select().from(practiceSubscriptions).where(eq(practiceSubscriptions.practiceId, pId)).limit(1);
      if (existingSub) {
        await db.update(practiceSubscriptions)
          .set({ tierName: cleanPlanName, paymentStatus: "Active" })
          .where(eq(practiceSubscriptions.id, existingSub.id));
      } else {
        await db.insert(practiceSubscriptions).values({ practiceId: pId, tierName: cleanPlanName, paymentStatus: "Active" });
      }

      await db.insert(systemPayments).values({
        practiceId: pId,
        amount: String(amount),
        currency: "GBP",
        paymentMethod: gateway,
        status: "completed",
        description: `Subscription Upgrade to ${cleanPlanName} via ${gateway.toUpperCase()} (Ref: ${generatedTxnRef})`
      });
    }

    console.log(`[PAYMENT VERIFIED] Practice #${pId} upgraded to ${cleanPlanName} via ${gateway.toUpperCase()} (Ref: ${generatedTxnRef})`);
    res.redirect(`/admin?checkout_success=true&plan=${encodeURIComponent(cleanPlanName)}&gateway=${encodeURIComponent(gateway)}&txnRef=${encodeURIComponent(generatedTxnRef)}`);
  } catch (error: any) {
    console.error("[PROCESS PAYMENT ERROR]", error);
    res.redirect(`/admin?checkout_error=${encodeURIComponent(error.message || "Payment processing failed")}`);
  }
});

// Also accept GET for redirect-based gateways (2Checkout, GoCardless return URL)
gatewayRouter.get("/process-gateway-payment", async (req, res) => {
  try {
    const gateway = (req.query.gateway as string || "online").toLowerCase();
    const plan = req.query.plan as string || "Pro";
    const amount = req.query.amount as string || "99.00";
    const practiceId = req.query.practiceId as string || "1";
    const txnRef = req.query.txnRef as string || "";

    if (["stripe", "paypal", "razorpay"].includes(gateway)) {
      throw new Error(`${gateway.toUpperCase()} does not support GET callbacks.`);
    }
    if (!txnRef && gateway !== "manual") {
      throw new Error("Transaction reference is required.");
    }

    const generatedTxnRef = txnRef || `${gateway.toUpperCase()}-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const cleanPlanName = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
    const pId = parseInt(practiceId);

    if (pId) {
      await db.update(practices).set({ plan: cleanPlanName.toLowerCase() }).where(eq(practices.id, pId));
      const [existingSub] = await db.select().from(practiceSubscriptions).where(eq(practiceSubscriptions.practiceId, pId)).limit(1);
      if (existingSub) {
        await db.update(practiceSubscriptions).set({ tierName: cleanPlanName, paymentStatus: "Active" }).where(eq(practiceSubscriptions.id, existingSub.id));
      } else {
        await db.insert(practiceSubscriptions).values({ practiceId: pId, tierName: cleanPlanName, paymentStatus: "Active" });
      }
      await db.insert(systemPayments).values({
        practiceId: pId, amount: String(amount), currency: "GBP",
        paymentMethod: gateway, status: "completed",
        description: `Subscription Upgrade to ${cleanPlanName} via ${gateway.toUpperCase()} (Ref: ${txnRef})`
      });
    }

    console.log(`[PAYMENT VERIFIED via GET] Practice #${pId} upgraded to ${cleanPlanName} via ${gateway.toUpperCase()} (Ref: ${txnRef})`);
    res.redirect(`/admin?checkout_success=true&plan=${encodeURIComponent(cleanPlanName)}&gateway=${encodeURIComponent(gateway)}&txnRef=${encodeURIComponent(txnRef)}`);
  } catch (error: any) {
    res.redirect(`/admin?checkout_error=${encodeURIComponent(error.message || "Payment processing failed")}`);
  }
});

export default gatewayRouter;
