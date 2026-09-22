"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Sparkles,
  Coins,
  Wallet,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Smartphone,
  CreditCard,
  Mail,
  FileText,
} from "lucide-react";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";
import Badge from "@/components/ui/badge/Badge";
import {
  usePractitionerProfile,
  usePractitionerReadiness,
  useUpdatePractitionerProfile,
} from "../../hooks/use-practitioners";
import type {
  PractitionerPayoutMethodType,
  PractitionerPayoutDestinationInput,
} from "../../types/practitioners.types";

export default function PractitionerAccountSetupHub() {
  const t = useTranslations("practitioner-area.setup");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: profileData } = usePractitionerProfile();
  const { data: readinessData, refetch: refetchReadiness } = usePractitionerReadiness();
  const updateProfileMutation = useUpdatePractitionerProfile();

  const profile = profileData?.profile;
  const readiness = readinessData?.readiness;

  // Session Pricing State
  const [sessionPrice30Egp, setSessionPrice30Egp] = useState("");
  const [sessionPrice30Usd, setSessionPrice30Usd] = useState("");
  const [sessionPrice60Egp, setSessionPrice60Egp] = useState("");
  const [sessionPrice60Usd, setSessionPrice60Usd] = useState("");
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // Instant Booking State
  const [enableInstantBooking, setEnableInstantBooking] = useState(false);
  const [instantPrice30Egp, setInstantPrice30Egp] = useState("");
  const [instantPrice30Usd, setInstantPrice30Usd] = useState("");
  const [instantPrice60Egp, setInstantPrice60Egp] = useState("");
  const [instantPrice60Usd, setInstantPrice60Usd] = useState("");
  const [isSavingInstant, setIsSavingInstant] = useState(false);

  // Payout State (Method-First)
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<PractitionerPayoutMethodType | "">("");
  const [payoutAccountHolderName, setPayoutAccountHolderName] = useState("");
  const [payoutBankName, setPayoutBankName] = useState("");
  const [payoutAccountNumber, setPayoutAccountNumber] = useState("");
  const [payoutIban, setPayoutIban] = useState("");
  const [payoutWalletProvider, setPayoutWalletProvider] = useState("");
  const [payoutWalletIdentifier, setPayoutWalletIdentifier] = useState("");
  const [payoutInstapayIdentifier, setPayoutInstapayIdentifier] = useState("");
  const [payoutPaypalEmail, setPayoutPaypalEmail] = useState("");
  const [payoutOtherDetails, setPayoutOtherDetails] = useState("");
  const [isSavingPayout, setIsSavingPayout] = useState(false);

  // Hydrate from profile
  useEffect(() => {
    if (!profile) return;

    if (profile.pricing?.session30?.egp) setSessionPrice30Egp(String(profile.pricing.session30.egp));
    if (profile.pricing?.session30?.usd) setSessionPrice30Usd(String(profile.pricing.session30.usd));
    if (profile.pricing?.session60?.egp) setSessionPrice60Egp(String(profile.pricing.session60.egp));
    if (profile.pricing?.session60?.usd) setSessionPrice60Usd(String(profile.pricing.session60.usd));

    const hasInstant = Boolean(
      profile.instantBookingPrice30Egp ||
        profile.instantBookingPrice30Usd ||
        profile.instantBookingPrice60Egp ||
        profile.instantBookingPrice60Usd
    );
    setEnableInstantBooking(hasInstant);
    if (profile.instantBookingPrice30Egp) setInstantPrice30Egp(String(profile.instantBookingPrice30Egp));
    if (profile.instantBookingPrice30Usd) setInstantPrice30Usd(String(profile.instantBookingPrice30Usd));
    if (profile.instantBookingPrice60Egp) setInstantPrice60Egp(String(profile.instantBookingPrice60Egp));
    if (profile.instantBookingPrice60Usd) setInstantPrice60Usd(String(profile.instantBookingPrice60Usd));

    if (profile.payoutDestination?.methodType) {
      setSelectedPayoutMethod(profile.payoutDestination.methodType);
      if (profile.payoutDestination.accountHolderName) setPayoutAccountHolderName(profile.payoutDestination.accountHolderName);
      if (profile.payoutDestination.bankName) setPayoutBankName(profile.payoutDestination.bankName);
      if (profile.payoutDestination.bankAccountNumber) setPayoutAccountNumber(profile.payoutDestination.bankAccountNumber);
      if (profile.payoutDestination.iban) setPayoutIban(profile.payoutDestination.iban);
      if (profile.payoutDestination.walletProvider) setPayoutWalletProvider(profile.payoutDestination.walletProvider);
      if (profile.payoutDestination.walletIdentifier) setPayoutWalletIdentifier(profile.payoutDestination.walletIdentifier);
    }
  }, [profile]);

  // Handle Save Normal Pricing
  const handleSaveNormalPricing = async () => {
    setIsSavingPricing(true);
    try {
      await updateProfileMutation.mutateAsync({
        sessionPrice30Egp: sessionPrice30Egp ? Number(sessionPrice30Egp) : null,
        sessionPrice30Usd: sessionPrice30Usd ? Number(sessionPrice30Usd) : null,
        sessionPrice60Egp: sessionPrice60Egp ? Number(sessionPrice60Egp) : null,
        sessionPrice60Usd: sessionPrice60Usd ? Number(sessionPrice60Usd) : null,
      });
      await refetchReadiness();
      toast.success(isRtl ? "تم حفظ أسعار الجلسات بنجاح" : "Session prices saved successfully");
    } catch (err: any) {
      toast.error(err?.message || (isRtl ? "فشل حفظ الأسعار" : "Failed to save prices"));
    } finally {
      setIsSavingPricing(false);
    }
  };

  // Handle Save Instant Pricing
  const handleSaveInstantPricing = async () => {
    setIsSavingInstant(true);
    try {
      await updateProfileMutation.mutateAsync({
        instantBookingPrice30Egp: enableInstantBooking && instantPrice30Egp ? Number(instantPrice30Egp) : null,
        instantBookingPrice30Usd: enableInstantBooking && instantPrice30Usd ? Number(instantPrice30Usd) : null,
        instantBookingPrice60Egp: enableInstantBooking && instantPrice60Egp ? Number(instantPrice60Egp) : null,
        instantBookingPrice60Usd: enableInstantBooking && instantPrice60Usd ? Number(instantPrice60Usd) : null,
      });
      await refetchReadiness();
      toast.success(
        isRtl ? "تم حفظ إعدادات الحجز الفوري بنجاح" : "Instant booking settings saved successfully"
      );
    } catch (err: any) {
      toast.error(err?.message || (isRtl ? "فشل حفظ إعدادات الحجز الفوري" : "Failed to save settings"));
    } finally {
      setIsSavingInstant(false);
    }
  };

  // Handle Save Payout Destination
  const handleSavePayout = async () => {
    if (!selectedPayoutMethod) return;

    setIsSavingPayout(true);
    try {
      const payoutPayload: PractitionerPayoutDestinationInput = {
        methodType: selectedPayoutMethod,
        countryCode: profile?.countryCode || "EG",
        accountHolderName: payoutAccountHolderName.trim() || null,
        bankName: selectedPayoutMethod === "BANK_ACCOUNT" ? payoutBankName.trim() || null : null,
        bankAccountNumber: selectedPayoutMethod === "BANK_ACCOUNT" ? payoutAccountNumber.trim() || null : null,
        iban: selectedPayoutMethod === "IBAN" ? payoutIban.trim() || null : null,
        walletProvider: selectedPayoutMethod === "WALLET" ? payoutWalletProvider.trim() || null : null,
        walletIdentifier: selectedPayoutMethod === "WALLET" ? payoutWalletIdentifier.trim() || null : null,
        instapayIdentifier: selectedPayoutMethod === "INSTAPAY" ? payoutInstapayIdentifier.trim() || null : null,
        paypalEmail: selectedPayoutMethod === "PAYPAL" ? payoutPaypalEmail.trim() || null : null,
        otherDetails: selectedPayoutMethod === "OTHER" ? payoutOtherDetails.trim() || null : null,
      };

      await updateProfileMutation.mutateAsync({
        payoutDestination: payoutPayload,
      });
      await refetchReadiness();
      toast.success(
        isRtl ? "تم حفظ بيانات تحويل الأرباح بنجاح" : "Payout details saved successfully"
      );
    } catch (err: any) {
      toast.error(err?.message || (isRtl ? "فشل حفظ بيانات الأرباح" : "Failed to save payout details"));
    } finally {
      setIsSavingPayout(false);
    }
  };

  // Dynamic capabilities returned from Backend (or generic fallback)
  const payoutCapabilities = readiness?.payoutCapabilities || [
    { methodType: "WALLET", semanticKey: "wallet" },
    { methodType: "INSTAPAY", semanticKey: "instapay" },
    { methodType: "BANK_ACCOUNT", semanticKey: "bank" },
    { methodType: "IBAN", semanticKey: "iban" },
    { methodType: "PAYPAL", semanticKey: "paypal" },
    { methodType: "OTHER", semanticKey: "other" },
  ];

  const getPayoutMethodLabel = (type: PractitionerPayoutMethodType) => {
    switch (type) {
      case "WALLET":
        return isRtl ? "محفظة إلكترونية (Vodafone/Orange/WE)" : "Electronic Wallet";
      case "INSTAPAY":
        return isRtl ? "إنستاباي (InstaPay GPA)" : "InstaPay";
      case "BANK_ACCOUNT":
        return isRtl ? "حساب بنكي محلي" : "Local Bank Account";
      case "IBAN":
        return isRtl ? "تحويل دولي عبر الآيبان (IBAN)" : "International IBAN Transfer";
      case "PAYPAL":
        return isRtl ? "باي بال (PayPal)" : "PayPal";
      case "OTHER":
        return isRtl ? "طريقة دفع أخرى" : "Other Payout Method";
      default:
        return type;
    }
  };

  const canPublish = readiness?.canPublish === true;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Approved Welcome Banner */}
      <SurfaceCard variant="page" className="border-emerald-200 bg-emerald-50/40 p-6 sm:p-8 dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isRtl ? "تم اعتماد طلب الانضمام" : "Application Approved"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary dark:text-white">
              {isRtl
                ? "مرحباً بك في سويّة! أكمل إعداد حسابك ليتم نشره للمرضى"
                : "Welcome to Sawiyaa! Complete Your Account for Publication"}
            </h1>
            <p className="text-sm text-text-secondary dark:text-white/80">
              {isRtl
                ? "تم قبول واعتماد أهليتك المهنية بنجاح. أكمل تسعير الجلسات الإلزامي وبياناتك لتصبح صفحتك جاهزة للنشر من قِبل إدارة سويّة."
                : "Your professional application is verified. Complete mandatory pricing and account details to make your profile ready for publication by Sawiyaa administrators."}
            </p>
          </div>
        </div>
      </SurfaceCard>

      {/* PUBLICATION READINESS STATUS CARD */}
      <SurfaceCard
        variant="section"
        className={`p-6 border transition-all ${
          canPublish
            ? "border-emerald-300 bg-emerald-50/20 dark:border-emerald-800 dark:bg-emerald-950/10"
            : "border-border-light bg-surface-primary"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {canPublish ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
              <h2 className="text-base font-bold text-text-primary dark:text-white">
                {canPublish
                  ? isRtl
                    ? "حسابك جاهز تماماً للنشر للمرضى ✓"
                    : "Account Ready for Publication ✓"
                  : isRtl
                    ? "حالة الجاهزية للنشر على منصة سويّة"
                    : "Publication Readiness Status"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {canPublish
                ? isRtl
                  ? "كافة الشروط مكتملة (الاعتماد، الملف المهني، التخصص، والأسعار الأربعة). سيتم مراجعة ونشر ملفك بواسطة إدارة سويّة."
                  : "All conditions met (approval, profile, specialty, and 4 session prices). Your profile is queued for administrative publication."
                : isRtl
                  ? "يجب استكمال تسعير الجلسات والبيانات المطلوبة لتفعيل إمكانية النشر."
                  : "Complete required session prices and profile details to enable publication."}
            </p>
          </div>

          <Badge variant="solid" color={canPublish ? "success" : "warning"} size="md">
            {canPublish
              ? isRtl
                ? "جاهز للنشر"
                : "Ready to Publish"
              : isRtl
                ? "غير مكتمل بعد"
                : "Setup Incomplete"}
          </Badge>
        </div>
      </SurfaceCard>

      {/* MANDATORY SECTION: Normal Session Pricing */}
      <SurfaceCard variant="section" className="space-y-5 p-6">
        <SurfaceHeader
          eyebrow={isRtl ? "مطلوب قبل النشر" : "Mandatory for Publication"}
          title={isRtl ? "أسعار الجلسات المعتادة (30 و 60 دقيقة)" : "Standard Session Pricing"}
          description={
            isRtl
              ? "سياسة سويّة تتطلب تحديد الأسعار الأربعة للجلسات (بالجنيه المصري وبالدولار الأمريكي)."
              : "Sawiyaa policy requires configuring all four prices (EGP and USD) for 30 and 60-minute sessions."
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* 30 Min EGP */}
          <div className="space-y-1.5 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            <Label htmlFor="sessionPrice30Egp">
              {isRtl ? "جلسة 30 دقيقة (بالجنيه EGP)" : "30-Min Session (EGP)"} <span className="text-danger">*</span>
            </Label>
            <InputField
              id="sessionPrice30Egp"
              type="number"
              min="1"
              value={sessionPrice30Egp}
              onChange={(e) => setSessionPrice30Egp(e.target.value)}
              placeholder="300"
            />
          </div>

          {/* 30 Min USD */}
          <div className="space-y-1.5 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            <Label htmlFor="sessionPrice30Usd">
              {isRtl ? "جلسة 30 دقيقة (بالدولار USD)" : "30-Min Session (USD)"} <span className="text-danger">*</span>
            </Label>
            <InputField
              id="sessionPrice30Usd"
              type="number"
              min="1"
              value={sessionPrice30Usd}
              onChange={(e) => setSessionPrice30Usd(e.target.value)}
              placeholder="10"
            />
          </div>

          {/* 60 Min EGP */}
          <div className="space-y-1.5 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            <Label htmlFor="sessionPrice60Egp">
              {isRtl ? "جلسة 60 دقيقة (بالجنيه EGP)" : "60-Min Session (EGP)"} <span className="text-danger">*</span>
            </Label>
            <InputField
              id="sessionPrice60Egp"
              type="number"
              min="1"
              value={sessionPrice60Egp}
              onChange={(e) => setSessionPrice60Egp(e.target.value)}
              placeholder="550"
            />
          </div>

          {/* 60 Min USD */}
          <div className="space-y-1.5 rounded-2xl border border-border-light bg-surface-secondary/40 p-4 dark:bg-white/[0.02]">
            <Label htmlFor="sessionPrice60Usd">
              {isRtl ? "جلسة 60 دقيقة (بالدولار USD)" : "60-Min Session (USD)"} <span className="text-danger">*</span>
            </Label>
            <InputField
              id="sessionPrice60Usd"
              type="number"
              min="1"
              value={sessionPrice60Usd}
              onChange={(e) => setSessionPrice60Usd(e.target.value)}
              placeholder="18"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleSaveNormalPricing}
            disabled={isSavingPricing}
            className="gap-2 font-bold"
          >
            {isSavingPricing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRtl ? "حفظ أسعار الجلسات" : "Save Session Prices"}
          </Button>
        </div>
      </SurfaceCard>

      {/* SEPARATED SECTION: Instant Booking Pricing */}
      <SurfaceCard variant="section" className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <SurfaceHeader
            eyebrow={isRtl ? "اختياري منفصل" : "Optional & Separate"}
            title={isRtl ? "تسعير الحجز الفوري" : "Instant Booking Pricing"}
            description={
              isRtl
                ? "إذا رغبت في استقبال الجلسات الفورية السريعة، حدد أسعاراً خاصة بها بشكل منفصل."
                : "Configure independent rates if you wish to accept on-demand Instant Bookings."
            }
          />
          <button
            type="button"
            onClick={() => setEnableInstantBooking(!enableInstantBooking)}
            className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors ${
              enableInstantBooking ? "bg-primary" : "bg-border-strong"
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full bg-white transition-transform ${
                enableInstantBooking ? (isRtl ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {enableInstantBooking && (
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border-light">
            <div className="space-y-1.5">
              <Label htmlFor="instantPrice30Egp">{isRtl ? "حجز فوري 30 دقيقة (EGP)" : "Instant 30m (EGP)"}</Label>
              <InputField
                id="instantPrice30Egp"
                type="number"
                value={instantPrice30Egp}
                onChange={(e) => setInstantPrice30Egp(e.target.value)}
                placeholder="350"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instantPrice30Usd">{isRtl ? "حجز فوري 30 دقيقة (USD)" : "Instant 30m (USD)"}</Label>
              <InputField
                id="instantPrice30Usd"
                type="number"
                value={instantPrice30Usd}
                onChange={(e) => setInstantPrice30Usd(e.target.value)}
                placeholder="12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instantPrice60Egp">{isRtl ? "حجز فوري 60 دقيقة (EGP)" : "Instant 60m (EGP)"}</Label>
              <InputField
                id="instantPrice60Egp"
                type="number"
                value={instantPrice60Egp}
                onChange={(e) => setInstantPrice60Egp(e.target.value)}
                placeholder="600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instantPrice60Usd">{isRtl ? "حجز فوري 60 دقيقة (USD)" : "Instant 60m (USD)"}</Label>
              <InputField
                id="instantPrice60Usd"
                type="number"
                value={instantPrice60Usd}
                onChange={(e) => setInstantPrice60Usd(e.target.value)}
                placeholder="20"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleSaveInstantPricing}
            disabled={isSavingInstant}
            className="gap-2"
          >
            {isSavingInstant && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRtl ? "حفظ إعدادات الحجز الفوري" : "Save Instant Booking"}
          </Button>
        </div>
      </SurfaceCard>

      {/* METHOD-FIRST SECTION: Payout Setup */}
      <SurfaceCard variant="section" className="space-y-5 p-6">
        <SurfaceHeader
          eyebrow={isRtl ? "طريقة تحويل الأرباح" : "Earnings Payout"}
          title={isRtl ? "كيف تود استلام أرباحك وجلساتك؟" : "How would you like to receive your earnings?"}
          description={
            isRtl
              ? "اختر الوسيلة الأنسب لك أولاً، ثم أدخل البيانات الخاصة بها فقط. إعداد الحساب البنكي اختياري ومستقل تماماً عن جاهزية النشر."
              : "Select your preferred payment channel first, then enter only its required details. Payout setup is optional and independent from publication."
          }
        />

        {/* Method Chooser */}
        <div className="grid gap-3 sm:grid-cols-3">
          {payoutCapabilities.map((cap) => {
            const isSelected = selectedPayoutMethod === cap.methodType;
            return (
              <button
                key={cap.methodType}
                type="button"
                onClick={() => setSelectedPayoutMethod(cap.methodType)}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-start transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm dark:border-primary/80 dark:bg-primary/10"
                    : "border-border-light bg-surface-secondary/40 hover:border-border-strong dark:bg-white/[0.02]"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-surface-tertiary text-text-muted dark:bg-white/10"
                  }`}
                >
                  {cap.methodType === "WALLET" ? (
                    <Smartphone className="h-5 w-5" />
                  ) : cap.methodType === "INSTAPAY" ? (
                    <Zap className="h-5 w-5" />
                  ) : cap.methodType === "BANK_ACCOUNT" ? (
                    <Building className="h-5 w-5" />
                  ) : cap.methodType === "IBAN" ? (
                    <CreditCard className="h-5 w-5" />
                  ) : cap.methodType === "PAYPAL" ? (
                    <Mail className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary dark:text-white">
                    {getPayoutMethodLabel(cap.methodType)}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {cap.methodType === "WALLET"
                      ? isRtl
                        ? "تحويل لمحفظة الهاتف (فودافون كاش، أورنج، وي، إي آند)"
                        : "Direct mobile wallet transfer"
                      : cap.methodType === "INSTAPAY"
                        ? isRtl
                          ? "تحويل فوري عبر عنوان إنستاباي IPA"
                          : "Instant transfer via InstaPay address"
                        : cap.methodType === "BANK_ACCOUNT"
                          ? isRtl
                            ? "تحويل لحسابك في أي بنك محلي"
                            : "Direct transfer to local bank account"
                          : cap.methodType === "IBAN"
                            ? isRtl
                              ? "تحويل بنكي دولي برقم الآيبان (IBAN)"
                              : "Direct international IBAN wire"
                            : cap.methodType === "PAYPAL"
                              ? isRtl
                                ? "تحويل لحساب باي بال (PayPal)"
                                : "Transfer to PayPal account"
                              : isRtl
                                ? "تفاصيل وتعليمات تحويل خاصة"
                                : "Custom payout instructions"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Progressive Disclosure: Specific Fields for Chosen Method */}
        {selectedPayoutMethod && (
          <div className="space-y-4 rounded-2xl border border-border-light bg-surface-secondary/30 p-5 dark:bg-white/[0.02]">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider dark:text-white">
              {isRtl ? "البيانات المطلوبة لطريقة التحويل المختارة:" : "Required details for selected method:"}
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="payoutAccountHolderName">
                  {isRtl ? "اسم صاحب الحساب / المحفظة" : "Account Holder Name"} <span className="text-danger">*</span>
                </Label>
                <InputField
                  id="payoutAccountHolderName"
                  value={payoutAccountHolderName}
                  onChange={(e) => setPayoutAccountHolderName(e.target.value)}
                  placeholder={isRtl ? "الاسم كما هو مسجل رسمياً" : "Full legal account name"}
                />
              </div>

              {selectedPayoutMethod === "WALLET" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="payoutWalletProvider">
                      {isRtl ? "نوع المحفظة / الخدمة" : "Wallet Provider"} <span className="text-danger">*</span>
                    </Label>
                    <SearchableCombobox
                      options={[
                        { value: "VODAFONE_CASH", label: isRtl ? "فودافون كاش (Vodafone Cash)" : "Vodafone Cash" },
                        { value: "ORANGE_CASH", label: isRtl ? "أورنج كاش (Orange Cash)" : "Orange Cash" },
                        { value: "ETISALAT_CASH", label: isRtl ? "إي آند كاش (Etisalat Cash)" : "e& Cash" },
                        { value: "WE_PAY", label: isRtl ? "وي باي (WE Pay)" : "WE Pay" },
                        { value: "SMART_WALLET", label: isRtl ? "المحفظة الذكية CIB Smart Wallet" : "CIB Smart Wallet" },
                      ]}
                      value={payoutWalletProvider}
                      onChange={(val) => setPayoutWalletProvider(val)}
                      placeholder={isRtl ? "اختر مزود المحفظة..." : "Select provider..."}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="payoutWalletIdentifier">
                      {isRtl ? "رقم الهاتف المسجل بالمحفظة" : "Mobile Wallet Phone Number"} <span className="text-danger">*</span>
                    </Label>
                    <InputField
                      id="payoutWalletIdentifier"
                      value={payoutWalletIdentifier}
                      onChange={(e) => setPayoutWalletIdentifier(e.target.value)}
                      placeholder="010XXXXXXXX"
                    />
                  </div>
                </>
              )}

              {selectedPayoutMethod === "INSTAPAY" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="payoutInstapayIdentifier">
                    {isRtl ? "عنوان إنستاباي IPA أو رقم الهاتف" : "InstaPay Address (IPA) or Phone"} <span className="text-danger">*</span>
                  </Label>
                  <InputField
                    id="payoutInstapayIdentifier"
                    value={payoutInstapayIdentifier}
                    onChange={(e) => setPayoutInstapayIdentifier(e.target.value)}
                    placeholder="username@instapay or 010XXXXXXXX"
                  />
                </div>
              )}

              {selectedPayoutMethod === "BANK_ACCOUNT" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="payoutBankName">
                      {isRtl ? "اسم البنك" : "Bank Name"} <span className="text-danger">*</span>
                    </Label>
                    <InputField
                      id="payoutBankName"
                      value={payoutBankName}
                      onChange={(e) => setPayoutBankName(e.target.value)}
                      placeholder={isRtl ? "البنك الأهلي المصري، بنك مصر، CIB..." : "National Bank of Egypt, CIB..."}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="payoutAccountNumber">
                      {isRtl ? "رقم الحساب البنكي" : "Bank Account Number"} <span className="text-danger">*</span>
                    </Label>
                    <InputField
                      id="payoutAccountNumber"
                      value={payoutAccountNumber}
                      onChange={(e) => setPayoutAccountNumber(e.target.value)}
                      placeholder="1234567890123"
                    />
                  </div>
                </>
              )}

              {selectedPayoutMethod === "IBAN" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="payoutIban">
                    {isRtl ? "رقم الآيبان الدولي (IBAN)" : "International IBAN Number"} <span className="text-danger">*</span>
                  </Label>
                  <InputField
                    id="payoutIban"
                    value={payoutIban}
                    onChange={(e) => setPayoutIban(e.target.value)}
                    placeholder="EG000000000000000000000000000"
                  />
                </div>
              )}

              {selectedPayoutMethod === "PAYPAL" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="payoutPaypalEmail">
                    {isRtl ? "البريد الإلكتروني لحساب باي بال" : "PayPal Account Email"} <span className="text-danger">*</span>
                  </Label>
                  <InputField
                    id="payoutPaypalEmail"
                    type="email"
                    value={payoutPaypalEmail}
                    onChange={(e) => setPayoutPaypalEmail(e.target.value)}
                    placeholder="practitioner@example.com"
                  />
                </div>
              )}

              {selectedPayoutMethod === "OTHER" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="payoutOtherDetails">
                    {isRtl ? "تفاصيل وتعليمات استلام الأرباح" : "Custom Payout Instructions"} <span className="text-danger">*</span>
                  </Label>
                  <TextArea
                    id="payoutOtherDetails"
                    rows={3}
                    value={payoutOtherDetails}
                    onChange={(val) => setPayoutOtherDetails(val)}
                    placeholder={
                      isRtl
                        ? "اكتب تفاصيل طريقة الدفع البديلة المفضلة..."
                        : "Describe your custom payout method details..."
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSavePayout}
                disabled={isSavingPayout || !payoutAccountHolderName.trim()}
                className="gap-2 font-bold"
              >
                {isSavingPayout && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRtl ? "حفظ بيانات الأرباح" : "Save Payout Details"}
              </Button>
            </div>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
