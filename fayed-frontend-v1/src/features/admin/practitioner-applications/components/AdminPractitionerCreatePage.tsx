"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import { useCreateAdminPractitionerDirect } from "../hooks/use-practitioner-applications";
import type {
  CreateAdminPractitionerRequest,
} from "../types/practitioner-applications.types";
import type {
  CredentialType,
  PractitionerGender,
  PractitionerPayoutMethodType,
  PractitionerType,
} from "@/features/practitioners/types/practitioners.types";
import { useSpecialties, useSpecialtyCategories } from "@/features/specialties/hooks/use-specialties";
import { SUPPORTED_COUNTRY_CODE_OPTIONS } from "@/constants/reference-data";
import {
  getLocalizedBankOptions,
  getLocalizedWalletProviderOptions,
  normalizeBankValue,
  normalizeWalletProviderValue,
} from "@/lib/catalogs/payout";

const PRACTITIONER_TYPES: PractitionerType[] = [
  "PSYCHOLOGIST",
  "PSYCHIATRIST",
  "NUTRITIONIST",
  "WEIGHT_LOSS_SPECIALIST",
  "COUNSELOR",
  "OTHER",
];

const CREDENTIAL_TYPES: CredentialType[] = [
  "LICENSE",
  "DEGREE",
  "CERTIFICATION",
  "NATIONAL_ID",
  "PASSPORT",
  "MEMBERSHIP",
  "OTHER",
];

const PAYOUT_METHODS: PractitionerPayoutMethodType[] = ["BANK_ACCOUNT", "IBAN", "WALLET", "OTHER"];

type FormState = {
  email: string;
  password: string;
  displayName: string;
  practitionerType: PractitionerType;
  practitionerGender: PractitionerGender | "";
  professionalTitle: string;
  bio: string;
  yearsOfExperience: string;
  countryCode: string;
  languageCodes: string[];
  primarySpecialtyCategoryId: string;
  specialtyIds: string[];
  payoutMethodType: PractitionerPayoutMethodType | "";
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  iban: string;
  walletProvider: string;
  walletIdentifier: string;
  otherDetails: string;
  credentialType: CredentialType;
  credentialFileUrl: string;
  credentialExpiresAt: string;
  note: string;
};

const INITIAL_FORM: FormState = {
  email: "",
  password: "",
  displayName: "",
  practitionerType: "OTHER",
  practitionerGender: "",
  professionalTitle: "",
  bio: "",
  yearsOfExperience: "",
  countryCode: "",
  languageCodes: ["ar"],
  primarySpecialtyCategoryId: "",
  specialtyIds: [],
  payoutMethodType: "",
  accountHolderName: "",
  bankName: "",
  bankAccountNumber: "",
  iban: "",
  walletProvider: "",
  walletIdentifier: "",
  otherDetails: "",
  credentialType: "LICENSE",
  credentialFileUrl: "",
  credentialExpiresAt: "",
  note: "",
};

export default function AdminPractitionerCreatePage() {
  const t = useTranslations("admin-area");
  const locale = useLocale();
  const router = useRouter();
  const createMutation = useCreateAdminPractitionerDirect();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const specialtyCategoriesQuery = useSpecialtyCategories(true);
  const specialtiesQuery = useSpecialties(undefined, true);

  const categoryOptions = useMemo(
    () =>
      (specialtyCategoriesQuery.data?.categories ?? []).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [specialtyCategoriesQuery.data?.categories]
  );

  const specialtiesForCategory = useMemo(
    () =>
      (specialtiesQuery.data?.specialties ?? []).filter((item) =>
        form.primarySpecialtyCategoryId
          ? item.category?.id === form.primarySpecialtyCategoryId
          : false
      ),
    [form.primarySpecialtyCategoryId, specialtiesQuery.data?.specialties]
  );

  const payoutBankOptions = useMemo(
    () => getLocalizedBankOptions(locale, form.countryCode, form.bankName),
    [form.bankName, form.countryCode, locale],
  );
  const payoutWalletProviderOptions = useMemo(
    () => getLocalizedWalletProviderOptions(locale, form.countryCode, form.walletProvider),
    [form.countryCode, form.walletProvider, locale],
  );

  const specialtyOptions = useMemo(
    () =>
      specialtiesForCategory.map((item) => ({
        value: item.id,
        text: item.name ?? item.slug,
        selected: form.specialtyIds.includes(item.id),
      })),
    [form.specialtyIds, specialtiesForCategory]
  );

  const languageOptions = useMemo(
    () => [
      { value: "ar", text: "Arabic", selected: form.languageCodes.includes("ar") },
      { value: "en", text: "English", selected: form.languageCodes.includes("en") },
    ],
    [form.languageCodes]
  );

  const payoutDestination = useMemo(() => {
    if (!form.payoutMethodType) return undefined;
    return {
      methodType: form.payoutMethodType,
      accountHolderName: form.accountHolderName.trim() || undefined,
      bankName: normalizeBankValue(form.bankName),
      bankAccountNumber: form.bankAccountNumber.trim() || undefined,
      iban: form.iban.trim() || undefined,
      walletProvider: normalizeWalletProviderValue(form.walletProvider),
      walletIdentifier: form.walletIdentifier.trim() || undefined,
      otherDetails: form.otherDetails.trim() || undefined,
    };
  }, [form]);

  const onSubmit = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const displayName = form.displayName.trim();
    const countryCode = form.countryCode.trim().toUpperCase();
    const specialtySelection = {
      primarySpecialtyCategoryId: form.primarySpecialtyCategoryId.trim(),
      specialtyIds: form.specialtyIds.filter(Boolean),
    };
    const languageCodes = form.languageCodes.filter(Boolean);

    if (!email || !password) {
      setErrorMessage(t("applications.directCreate.validationRequired"));
      return;
    }
    if (!specialtySelection.primarySpecialtyCategoryId) {
      setErrorMessage(t("applications.directCreate.validationCategoryRequired"));
      return;
    }
    if (specialtySelection.specialtyIds.length === 0) {
      setErrorMessage(t("applications.directCreate.validationSpecialtiesRequired"));
      return;
    }
    if (languageCodes.length === 0) {
      setErrorMessage("Choose at least one language.");
      return;
    }

    const yearsOfExperience =
      form.yearsOfExperience.trim().length > 0 ? Number(form.yearsOfExperience) : undefined;
    if (
      yearsOfExperience !== undefined &&
      (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0)
    ) {
      setErrorMessage(t("applications.directCreate.validationYears"));
      return;
    }

    const payload: CreateAdminPractitionerRequest = {
      email,
      password,
      displayName: displayName || undefined,
      practitionerType: form.practitionerType,
      practitionerGender: form.practitionerGender || undefined,
      professionalTitle: form.professionalTitle.trim() || undefined,
      bio: form.bio.trim() || undefined,
      yearsOfExperience,
      countryCode: countryCode || undefined,
      languageCodes,
      specialtySelection,
      payoutDestination,
      credentials: form.credentialFileUrl.trim()
        ? [
            {
              credentialType: form.credentialType,
              fileUrl: form.credentialFileUrl.trim(),
              expiresAt: form.credentialExpiresAt.trim()
                ? `${form.credentialExpiresAt.trim()}T00:00:00.000Z`
                : undefined,
            },
          ]
        : undefined,
      note: form.note.trim() || undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setSuccessMessage(t("applications.directCreate.submitSuccess"));
        setTimeout(() => {
          router.push("/admin/practitioner-applications" as never);
        }, 500);
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          t("applications.directCreate.submitError");
        setErrorMessage(message);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-light bg-surface-primary p-5">
        <h2 className="text-lg font-semibold text-text-primary">
          {t("applications.directCreate.modalTitle")}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {t("applications.directCreate.modalDescription")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border-light bg-white p-5">
          <h3 className="text-sm font-semibold text-text-primary">Account & profile</h3>
          <div>
            <Label>{t("applications.directCreate.fields.email")}</Label>
            <InputField type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.password")}</Label>
            <InputField type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.displayName")}</Label>
            <InputField type="text" value={form.displayName} onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))} />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.countryCode")}</Label>
            <Select
              key={`create-country-${SUPPORTED_COUNTRY_CODE_OPTIONS.length}`}
              options={SUPPORTED_COUNTRY_CODE_OPTIONS}
              defaultValue={form.countryCode}
              onChange={(value) => setForm((s) => ({ ...s, countryCode: value }))}
            />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.practitionerType")}</Label>
            <Select
              key={`create-type-${form.practitionerType}`}
              options={PRACTITIONER_TYPES.map((type) => ({
                value: type,
                label: t(`practitionerType.${type}`),
              }))}
              defaultValue={form.practitionerType}
              onChange={(value) => setForm((s) => ({ ...s, practitionerType: value as PractitionerType }))}
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Select
              key={`create-gender-${form.practitionerGender || "none"}`}
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
              ]}
              defaultValue={form.practitionerGender}
              onChange={(value) => setForm((s) => ({ ...s, practitionerGender: value as PractitionerGender }))}
            />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.professionalTitle")}</Label>
            <InputField type="text" value={form.professionalTitle} onChange={(e) => setForm((s) => ({ ...s, professionalTitle: e.target.value }))} />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.yearsOfExperience")}</Label>
            <InputField type="number" min={0} value={form.yearsOfExperience} onChange={(e) => setForm((s) => ({ ...s, yearsOfExperience: e.target.value }))} />
          </div>
          <div>
            <Label>Languages</Label>
            <MultiSelect
              key={`create-languages-${form.languageCodes.join("-")}`}
              label=""
              options={languageOptions}
              defaultSelected={form.languageCodes}
              onChange={(selected) => setForm((s) => ({ ...s, languageCodes: selected }))}
            />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.bio")}</Label>
            <TextArea value={form.bio} onChange={(value) => setForm((s) => ({ ...s, bio: value }))} rows={4} />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border-light bg-white p-5">
          <h3 className="text-sm font-semibold text-text-primary">Specialty, payout, credentials</h3>
          <div>
            <Label>{t("applications.directCreate.fields.primarySpecialtyCategory")}</Label>
            <Select
              key={`create-category-${categoryOptions.length}`}
              options={categoryOptions}
              defaultValue={form.primarySpecialtyCategoryId}
              onChange={(value) => setForm((s) => ({ ...s, primarySpecialtyCategoryId: value, specialtyIds: [] }))}
            />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.specialties")}</Label>
            <MultiSelect
              key={`create-specialties-${form.primarySpecialtyCategoryId || "none"}`}
              label=""
              options={specialtyOptions}
              defaultSelected={form.specialtyIds}
              disabled={!form.primarySpecialtyCategoryId || specialtyOptions.length === 0}
              onChange={(selected) => setForm((s) => ({ ...s, specialtyIds: selected }))}
            />
          </div>
          <div>
            <Label>Payout method</Label>
            <Select
              key={`create-payout-${form.payoutMethodType || "none"}`}
              options={PAYOUT_METHODS.map((method) => ({ value: method, label: method }))}
              defaultValue={form.payoutMethodType}
              onChange={(value) => setForm((s) => ({ ...s, payoutMethodType: value as PractitionerPayoutMethodType }))}
            />
          </div>
          {form.payoutMethodType ? (
            <div className="grid gap-3 rounded-xl border border-border-light p-4">
              <div>
                <Label>Account holder name</Label>
                <InputField type="text" value={form.accountHolderName} onChange={(e) => setForm((s) => ({ ...s, accountHolderName: e.target.value }))} />
              </div>
              {form.payoutMethodType === "BANK_ACCOUNT" ? (
                <>
                  <div>
                    <Label>Bank name</Label>
                    <Select
                      key={`create-bank-${form.countryCode || "all"}-${form.bankName || "none"}`}
                      options={payoutBankOptions}
                      defaultValue={form.bankName}
                      onChange={(value) => setForm((s) => ({ ...s, bankName: value }))}
                    />
                  </div>
                  <div>
                    <Label>Bank account number</Label>
                    <InputField type="text" value={form.bankAccountNumber} onChange={(e) => setForm((s) => ({ ...s, bankAccountNumber: e.target.value }))} />
                  </div>
                </>
              ) : null}
              {form.payoutMethodType === "IBAN" ? (
                <div>
                  <Label>IBAN</Label>
                  <InputField type="text" value={form.iban} onChange={(e) => setForm((s) => ({ ...s, iban: e.target.value }))} />
                </div>
              ) : null}
              {form.payoutMethodType === "WALLET" ? (
                <>
                  <div>
                    <Label>Wallet provider</Label>
                    <Select
                      key={`create-wallet-provider-${form.countryCode || "all"}-${form.walletProvider || "none"}`}
                      options={payoutWalletProviderOptions}
                      defaultValue={form.walletProvider}
                      onChange={(value) => setForm((s) => ({ ...s, walletProvider: value }))}
                    />
                  </div>
                  <div>
                    <Label>Wallet number</Label>
                    <InputField type="text" value={form.walletIdentifier} onChange={(e) => setForm((s) => ({ ...s, walletIdentifier: e.target.value }))} />
                  </div>
                </>
              ) : null}
              {form.payoutMethodType === "OTHER" ? (
                <div>
                  <Label>Other payout details</Label>
                  <TextArea value={form.otherDetails} onChange={(value) => setForm((s) => ({ ...s, otherDetails: value }))} rows={3} />
                </div>
              ) : null}
            </div>
          ) : null}
          <div>
            <Label>{t("applications.directCreate.fields.credentialType")}</Label>
            <Select
              key={`create-credential-${form.credentialType}`}
              options={CREDENTIAL_TYPES.map((type) => ({
                value: type,
                label: t(`applications.directCreate.credentialType.${type}`),
              }))}
              defaultValue={form.credentialType}
              onChange={(value) => setForm((s) => ({ ...s, credentialType: value as CredentialType }))}
            />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.credentialFileUrl")}</Label>
            <InputField type="url" value={form.credentialFileUrl} onChange={(e) => setForm((s) => ({ ...s, credentialFileUrl: e.target.value }))} />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.credentialExpiresAt")}</Label>
            <InputField type="date" value={form.credentialExpiresAt} onChange={(e) => setForm((s) => ({ ...s, credentialExpiresAt: e.target.value }))} />
          </div>
          <div>
            <Label>{t("applications.directCreate.fields.note")}</Label>
            <TextArea value={form.note} onChange={(value) => setForm((s) => ({ ...s, note: value }))} rows={3} />
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="rounded-xl border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">{successMessage}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button disabled={createMutation.isPending} onClick={onSubmit}>
          {createMutation.isPending ? t("applications.directCreate.submitting") : t("applications.directCreate.submit")}
        </Button>
        <Button variant="outline" onClick={() => router.push("/admin/practitioner-applications" as never)}>
          {t("applications.directCreate.cancel")}
        </Button>
      </div>
    </div>
  );
}
