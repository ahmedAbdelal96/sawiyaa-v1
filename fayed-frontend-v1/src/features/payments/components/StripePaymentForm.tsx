"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useTranslations } from "next-intl";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

type StripeFormProps = {
  returnUrl: string;
  amountLabel: string;
  t: ReturnType<typeof useTranslations<"payments">>;
};

function StripeForm({ returnUrl, amountLabel, t }: StripeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // Only reached if there is an immediate error (e.g., card declined, invalid details).
    // Successful payments redirect automatically to returnUrl.
    if (stripeError) {
      setError(stripeError.message ?? t("checkout.error"));
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-border-light bg-white p-5 dark:border-border-light dark:bg-surface-secondary">
        <p className="mb-4 text-sm font-semibold text-text-primary dark:text-white/90">
          {t("checkout.heading")}
        </p>
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!stripe || isSubmitting}
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t("checkout.paying") : t("checkout.pay", { amount: amountLabel })}
        </button>

        <p className="mt-3 text-center text-[11px] text-text-muted">{t("checkout.note")}</p>
      </div>
    </form>
  );
}

type StripePaymentFormProps = {
  clientSecret: string;
  netPaidAmount: string;
  currency: string;
  returnUrl: string;
};

export default function StripePaymentForm({
  clientSecret,
  netPaidAmount,
  currency,
  returnUrl,
}: StripePaymentFormProps) {
  const t = useTranslations("payments");
  const locale = typeof document !== "undefined"
    ? document.documentElement.lang || "en"
    : "en";

  const amountLabel = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(Number(netPaidAmount));

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            borderRadius: "14px",
            colorPrimary: "#6366f1",
          },
        },
      }}
    >
      <StripeForm returnUrl={returnUrl} amountLabel={amountLabel} t={t} />
    </Elements>
  );
}
