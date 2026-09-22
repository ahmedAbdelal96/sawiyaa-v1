"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  User,
  Briefcase,
  FileCheck2,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import { SearchableCombobox } from "@/components/form/SearchableCombobox";
import { SurfaceCard, SurfaceHeader } from "@/components/shared/SurfaceShell";
import {
  usePractitionerApplicationStatus,
  usePractitionerCountries,
  usePractitionerReadiness,
  useSaveApplicationDraft,
  useSubmitPractitionerApplication,
} from "../../hooks/use-practitioners";
import {
  useSpecialties,
  useSpecialtyCategories,
} from "@/features/specialties/hooks/use-specialties";
import type {
  PractitionerGender,
  PractitionerType,
  UpdatePractitionerApplicationDraftRequest,
} from "../../types/practitioners.types";
import {
  getLocalizedSpecialtyCategoryName,
  getLocalizedSpecialtyName,
} from "@/features/specialties/utils/localized-specialty";
import {
  getLocalizedProfessionalTitleOptions,
} from "../../constants/professional-title-options";
import PractitionerDocumentsSection from "./PractitionerDocumentsSection";
import {
  filterSpecialtiesByPrimaryCategory,
  retainValidSpecialtyIds,
} from "./specialty-selection";

const PRACTITIONER_TYPES: Array<{ value: PractitionerType; labelAr: string; labelEn: string }> = [
  { value: "PSYCHOLOGIST", labelAr: "أخصائي نفسي", labelEn: "Psychologist" },
  { value: "PSYCHIATRIST", labelAr: "طبيب نفسي", labelEn: "Psychiatrist" },
  { value: "NUTRITIONIST", labelAr: "أخصائي تغذية", labelEn: "Nutritionist" },
  { value: "WEIGHT_LOSS_SPECIALIST", labelAr: "أخصائي علاج سمنة ونحافة", labelEn: "Weight Loss Specialist" },
  { value: "COUNSELOR", labelAr: "مستشار إرشادي", labelEn: "Counselor" },
  { value: "OTHER", labelAr: "أخرى", labelEn: "Other" },
];

const GENDER_OPTIONS: Array<{ value: PractitionerGender; labelAr: string; labelEn: string }> = [
  { value: "MALE", labelAr: "ذكر", labelEn: "Male" },
  { value: "FEMALE", labelAr: "أنثى", labelEn: "Female" },
];

const LANGUAGE_OPTIONS = [
  { value: "ar", label: "العربية (Arabic)" },
  { value: "en", label: "English" },
];

export default function PractitionerApplicationHub() {
  const t = useTranslations("practitioner-area.application");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: statusData } = usePractitionerApplicationStatus();
  const { data: readinessData } = usePractitionerReadiness();
  const { data: countriesData } = usePractitionerCountries();
  const { data: specialtyCategoriesData } = useSpecialtyCategories();
  const { data: specialtiesData, isLoading: isSpecialtiesLoading } = useSpecialties();
  const apiSpecialties = useMemo(
    () => specialtiesData?.specialties || [],
    [specialtiesData?.specialties],
  );

  const saveDraftMutation = useSaveApplicationDraft();
  const submitMutation = useSubmitPractitionerApplication();

  const application = statusData?.application;
  const readiness = readinessData?.readiness;
  const snapshot = application?.submissionSnapshot as Record<string, any> | null;

  // Local Form State
  const [displayName, setDisplayName] = useState("");
  const [practitionerGender, setPractitionerGender] = useState<PractitionerGender | "">("");
  const [countryCode, setCountryCode] = useState("EG");
  const [languageCodes, setLanguageCodes] = useState<string[]>(["ar"]);
  const [practitionerType, setPractitionerType] = useState<PractitionerType | "">("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [primaryCategoryId, setPrimaryCategoryId] = useState("");
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Autosave tracking
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const isInitialHydrated = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hydrate initial values from backend snapshot / readiness
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isInitialHydrated.current || !application) return;

    if (snapshot) {
      if (snapshot.displayName) setDisplayName(snapshot.displayName);
      if (snapshot.practitionerGender) setPractitionerGender(snapshot.practitionerGender);
      if (snapshot.countryCode) setCountryCode(snapshot.countryCode);
      if (Array.isArray(snapshot.languageCodes) && snapshot.languageCodes.length > 0) {
        setLanguageCodes(snapshot.languageCodes);
      }
      if (snapshot.practitionerType && snapshot.practitionerTypeExplicit === true) {
        setPractitionerType(snapshot.practitionerType);
      }
      if (snapshot.professionalTitle) setProfessionalTitle(snapshot.professionalTitle);
      if (snapshot.yearsOfExperience !== undefined && snapshot.yearsOfExperience !== null) {
        setYearsOfExperience(String(snapshot.yearsOfExperience));
      }
      if (snapshot.bio) setBio(snapshot.bio);
      if (snapshot.specialtySelection?.primarySpecialtyCategoryId) {
        setPrimaryCategoryId(snapshot.specialtySelection.primarySpecialtyCategoryId);
      }
      const persistedSpecialtyIds = Array.isArray(snapshot.specialtySelection?.specialtyIds)
        ? snapshot.specialtySelection.specialtyIds
        : Array.isArray(snapshot.specialtySelection?.specialties)
          ? snapshot.specialtySelection.specialties
              .map((item: { specialtyId?: unknown }) => item?.specialtyId)
              .filter((id: unknown): id is string => typeof id === "string")
          : [];
      if (persistedSpecialtyIds.length > 0) {
        setSelectedSpecialtyIds(persistedSpecialtyIds);
      }
    }
    isInitialHydrated.current = true;
  }, [application, snapshot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Debounced Autosave Trigger
  const triggerAutosave = useCallback(
    (payload: UpdatePractitionerApplicationDraftRequest) => {
      if (!isInitialHydrated.current) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("saving");
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveDraftMutation.mutateAsync(payload);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("error");
        }
      }, 900);
    },
    [saveDraftMutation]
  );

  const handleFieldChange = (updates: Partial<{
    displayName: string;
    practitionerGender: PractitionerGender | "";
    countryCode: string;
    languageCodes: string[];
    practitionerType: PractitionerType | "";
    professionalTitle: string;
    yearsOfExperience: string;
    primaryCategoryId: string;
    selectedSpecialtyIds: string[];
    bio: string;
  }>) => {
    const nextDisplayName = updates.displayName !== undefined ? updates.displayName : displayName;
    const nextGender = updates.practitionerGender !== undefined ? updates.practitionerGender : practitionerGender;
    const nextCountry = updates.countryCode !== undefined ? updates.countryCode : countryCode;
    const nextLanguages = updates.languageCodes !== undefined ? updates.languageCodes : languageCodes;
    const nextType = updates.practitionerType !== undefined ? updates.practitionerType : practitionerType;
    const nextTitle = updates.professionalTitle !== undefined ? updates.professionalTitle : professionalTitle;
    const nextExp = updates.yearsOfExperience !== undefined ? updates.yearsOfExperience : yearsOfExperience;
    const nextPrimaryCat = updates.primaryCategoryId !== undefined ? updates.primaryCategoryId : primaryCategoryId;
    const nextSpecialties = retainValidSpecialtyIds(
      updates.selectedSpecialtyIds !== undefined
        ? updates.selectedSpecialtyIds
        : selectedSpecialtyIds,
      apiSpecialties,
      nextPrimaryCat,
    );
    const nextBio = updates.bio !== undefined ? updates.bio : bio;

    if (updates.displayName !== undefined) setDisplayName(updates.displayName);
    if (updates.practitionerGender !== undefined) setPractitionerGender(updates.practitionerGender);
    if (updates.countryCode !== undefined) setCountryCode(updates.countryCode);
    if (updates.languageCodes !== undefined) setLanguageCodes(updates.languageCodes);
    if (updates.practitionerType !== undefined) setPractitionerType(updates.practitionerType);
    if (updates.professionalTitle !== undefined) setProfessionalTitle(updates.professionalTitle);
    if (updates.yearsOfExperience !== undefined) setYearsOfExperience(updates.yearsOfExperience);
    if (updates.primaryCategoryId !== undefined) setPrimaryCategoryId(updates.primaryCategoryId);
    if (updates.selectedSpecialtyIds !== undefined) setSelectedSpecialtyIds(updates.selectedSpecialtyIds);
    if (updates.bio !== undefined) setBio(updates.bio);

    triggerAutosave({
      displayName: nextDisplayName.trim() || undefined,
      practitionerGender: nextGender || null,
      countryCode: nextCountry || undefined,
      languageCodes: nextLanguages,
      practitionerType: nextType || undefined,
      practitionerTypeExplicit:
        updates.practitionerType !== undefined ? Boolean(nextType) : undefined,
      professionalTitle: nextTitle.trim() || null,
      yearsOfExperience: nextExp ? Number(nextExp) : null,
      bio: nextBio.trim() || null,
      specialtySelection: nextPrimaryCat
        ? {
            primarySpecialtyCategoryId: nextPrimaryCat,
            specialtyIds: nextSpecialties,
          }
        : undefined,
    });
  };

  useEffect(() => {
    if (!isInitialHydrated.current || apiSpecialties.length === 0) return;
    const validSelectedIds = retainValidSpecialtyIds(
      selectedSpecialtyIds,
      apiSpecialties,
      primaryCategoryId,
    );
    const selectionIsAlreadyValid =
      validSelectedIds.length === selectedSpecialtyIds.length &&
      validSelectedIds.every((id, index) => id === selectedSpecialtyIds[index]);
    if (selectionIsAlreadyValid) return;

    if (primaryCategoryId) {
      triggerAutosave({
        specialtySelection: {
          primarySpecialtyCategoryId: primaryCategoryId,
          specialtyIds: validSelectedIds,
        },
      });
    }
  }, [apiSpecialties, primaryCategoryId, selectedSpecialtyIds, triggerAutosave]);

  const handleSubmit = async () => {
    if (!readiness?.canSubmitApplication) {
      toast.error(
        isRtl
          ? "يرجى استكمال كافة المتطلبات الإلزامية قبل تقديم الطلب"
          : "Please complete all mandatory requirements before submitting"
      );
      return;
    }

    try {
      await submitMutation.mutateAsync({});
      toast.success(
        isRtl
          ? "تم إرسال طلب الانضمام بنجاح للمراجعة"
          : "Application submitted successfully for review"
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          (isRtl
            ? "تعذر إرسال الطلب، يرجى مراجعة الحقول المطلوبة"
            : "Failed to submit application")
      );
    }
  };

  const countries = countriesData || [];
  const countryOptions = countries.map((c) => ({
    value: c.isoCode,
    label: isRtl && c.nativeName ? `${c.nativeName} (${c.name})` : c.name,
  }));

  const specialtyCategories = specialtyCategoriesData?.categories || [];
  const filteredSpecialties = filterSpecialtiesByPrimaryCategory(
    apiSpecialties,
    primaryCategoryId,
  );
  const validSelectedSpecialtyIds = retainValidSpecialtyIds(
    selectedSpecialtyIds,
    apiSpecialties,
    primaryCategoryId,
  );

  const specialtyOptions = filteredSpecialties.map((s) => ({
    value: s.id,
    label: getLocalizedSpecialtyName(s, locale),
  }));

  const professionalTitleOptions = getLocalizedProfessionalTitleOptions(locale);

  // Missing requirements human translations
  const missingRequirementsList = Array.from(
    new Set(readiness?.missingRequirements || []),
  );

  const getMissingRequirementLabel = (key: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      displayName: { ar: "الاسم الكامل", en: "Full name" },
      professionalTitle: { ar: "المسمى المهني", en: "Professional title" },
      bio: { ar: "النبذة التعريفية", en: "Professional bio" },
      countryCode: { ar: "الدولة", en: "Country" },
      yearsOfExperience: { ar: "سنوات الخبرة", en: "Years of experience" },
      languages: { ar: "لغات الجلسة", en: "Languages" },
      languageCodes: { ar: "لغات الجلسات", en: "Session languages" },
      specialties: { ar: "التخصص المهني", en: "Specialties" },
      specialtyIds: { ar: "التخصصات الفرعية", en: "Sub-specialties" },
      primarySpecialtyCategoryId: { ar: "التخصص الأساسي", en: "Primary specialty" },
      credentials: { ar: "المستندات المطلوبة", en: "Required credentials" },
      "credentials.degree": { ar: "شهادة المؤهل الدراسي", en: "Academic qualification degree" },
      "credentials.identity": { ar: "إثبات الهوية", en: "Identity verification document" },
      "credentials.nationalIdFront": { ar: "الرقم القومي - الوجه الأمامي", en: "National ID - front side" },
      "credentials.nationalIdBack": { ar: "الرقم القومي - الوجه الخلفي", en: "National ID - back side" },
      "credentials.professionalAuthorization": { ar: "ترخيص مزاولة المهنة", en: "Practice license or authorization" },
      identityDocuments: { ar: "إثبات الهوية الوطنية", en: "Identity verification document" },
      academicCertificate: { ar: "شهادة المؤهل الدراسي", en: "Academic qualification degree" },
      professionalAuthorization: { ar: "كارنيه النقابة أو ترخيص مزاولة المهنة", en: "Syndicate card or practice license" },
      activeAccount: { ar: "تفعيل الحساب", en: "Active account" },
      practitionerOtpVerified: { ar: "التحقق من رمز OTP", en: "OTP verification" },
    };
    return map[key] ? (isRtl ? map[key].ar : map[key].en) : key;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Calm Header Explaining What and Why */}
      <SurfaceCard variant="page" className="relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary dark:bg-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isRtl ? "طلب انضمام ممارس" : "Practitioner Application"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary dark:text-white">
              {isRtl
                ? "انضم إلى نخبة الأخصائيين والأطباء في سويّة"
                : "Join the Elite Care Specialists at Sawiyaa"}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-white/80">
              {isRtl
                ? "نحتاج فقط لبياناتك ومستنداتك المهنية للتحقق من أهليتك. سنراجع طلبك خلال يوم عمل واحد (24 ساعة). بعد القبول ستتمكن من ضبط أسعار الجلسات وإعدادات حسابك بالكامل."
                : "We only collect what is needed to verify your professional eligibility. We will review your application within 1 business day. Session prices and account settings come after approval."}
            </p>
          </div>

          {/* Autosave Pill */}
          <div className="self-start sm:self-center shrink-0">
            {saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                {isRtl ? "جاري الحفظ..." : "Saving..."}
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {isRtl ? "تم حفظ المسودة" : "Draft saved"}
              </span>
            )}
            {saveStatus === "error" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-100 px-3 py-1 text-xs font-semibold text-danger-700 dark:bg-danger-950/60 dark:text-danger-400">
                <AlertCircle className="h-3 w-3" />
                {isRtl ? "تعذر الحفظ" : "Save failed"}
              </span>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 1: Basic Information */}
      <SurfaceCard variant="section" className="space-y-5 p-6">
        <SurfaceHeader
          eyebrow={isRtl ? "القسم الأول" : "Section 1"}
          title={isRtl ? "البيانات الأساسية" : "Basic Information"}
          description={
            isRtl
              ? "بياناتك الشخصية الأساسية كما ستظهر في مراجعة الأهلية."
              : "Basic personal details used for verification."
          }
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="displayName">
              {isRtl ? "الاسم الكامل (ثلاثي أو رباعي)" : "Full Display Name"} <span className="text-danger">*</span>
            </Label>
            <InputField
              id="displayName"
              value={displayName}
              onChange={(e) => handleFieldChange({ displayName: e.target.value })}
              placeholder={isRtl ? "د. أحمد محمد علي" : "Dr. Ahmed Ali"}
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label htmlFor="practitionerGender">
              {isRtl ? "النوع" : "Gender"} <span className="text-danger">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => handleFieldChange({ practitionerGender: g.value })}
                  className={`flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${
                    practitionerGender === g.value
                      ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                      : "border-border-light bg-surface-secondary text-text-muted hover:border-border-strong dark:bg-white/5"
                  }`}
                >
                  {isRtl ? g.labelAr : g.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <Label htmlFor="countryCode">
              {isRtl ? "دولة الممارسة والإقامة" : "Country of Practice"} <span className="text-danger">*</span>
            </Label>
            <SearchableCombobox
              options={countryOptions}
              value={countryCode}
              onChange={(val) => handleFieldChange({ countryCode: val })}
              placeholder={isRtl ? "اختر الدولة..." : "Select Country..."}
            />
          </div>

          {/* Languages */}
          <div className="space-y-1.5">
            <MultiSelect
              label={isRtl ? "لغات تقديم الجلسات" : "Session Languages"}
              options={LANGUAGE_OPTIONS.map((l) => ({
                value: l.value,
                text: l.label,
                selected: languageCodes.includes(l.value),
              }))}
              defaultSelected={languageCodes}
              onChange={(vals) => handleFieldChange({ languageCodes: vals })}
              placeholder={isRtl ? "اختر اللغات..." : "Select Languages..."}
            />
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 2: Professional Information */}
      <SurfaceCard variant="section" className="space-y-5 p-6">
        <SurfaceHeader
          eyebrow={isRtl ? "القسم الثاني" : "Section 2"}
          title={isRtl ? "المعلومات المهنية" : "Professional Information"}
          description={
            isRtl
              ? "مجال تخصصك ودرجتك العلمية والسنوات الفعلية لممارستك المهنية."
              : "Your practice field, title, and verified years of experience."
          }
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Practitioner Type */}
          <div className="space-y-1.5">
            <Label htmlFor="practitionerType">
              {isRtl ? "نوع الممارس" : "Practitioner Type"} <span className="text-danger">*</span>
            </Label>
            <SearchableCombobox
              options={PRACTITIONER_TYPES.map((t) => ({
                value: t.value,
                label: isRtl ? t.labelAr : t.labelEn,
              }))}
              value={practitionerType}
              onChange={(val) => handleFieldChange({ practitionerType: val as PractitionerType })}
              placeholder={isRtl ? "اختر نوع الممارس..." : "Select Type..."}
            />
            <p className="text-xs leading-5 text-text-muted">
              {isRtl
                ? "نوع الممارس يصف الفئة المهنية العامة، أما المسمى المهني فيوضح درجتك أو لقبك المهني."
                : "Practitioner Type is your broad professional category; Professional Title describes your credential or role."}
            </p>
          </div>

          {/* Professional Title */}
          <div className="space-y-1.5">
            <Label htmlFor="professionalTitle">
              {isRtl ? "المسمى المهني / الدرجة" : "Professional Title"} <span className="text-danger">*</span>
            </Label>
            <SearchableCombobox
              options={professionalTitleOptions}
              value={professionalTitle}
              onChange={(val) => handleFieldChange({ professionalTitle: val })}
              placeholder={isRtl ? "اختر المسمى المهني..." : "Select Professional Title..."}
            />
            <p className="text-xs leading-5 text-text-muted">
              {isRtl
                ? "اختر المسمى الذي يطابق مؤهلك أو درجتك المهنية."
                : "Choose the title that matches your professional qualification or grade."}
            </p>
          </div>

          {/* Years of Experience */}
          <div className="space-y-1.5">
            <Label htmlFor="yearsOfExperience">
              {isRtl ? "سنوات الخبرة العملية" : "Years of Experience"} <span className="text-danger">*</span>
            </Label>
            <InputField
              id="yearsOfExperience"
              type="number"
              min="0"
              max="60"
              value={yearsOfExperience}
              onChange={(e) => handleFieldChange({ yearsOfExperience: e.target.value })}
              placeholder="5"
            />
          </div>

          {/* Specialty Category */}
          <div className="space-y-1.5">
            <Label htmlFor="primaryCategoryId">
              {isRtl ? "التخصص الأساسي" : "Primary Specialty"} <span className="text-danger">*</span>
            </Label>
            <SearchableCombobox
              options={specialtyCategories.map((cat) => ({
                value: cat.id,
                label: getLocalizedSpecialtyCategoryName(cat, locale),
              }))}
              value={primaryCategoryId}
              onChange={(val) =>
                handleFieldChange({
                  primaryCategoryId: val,
                  selectedSpecialtyIds: [], // reset sub-specialties on category switch
                })
              }
              placeholder={isRtl ? "اختر التخصص الأساسي..." : "Select Primary Specialty..."}
            />
          </div>

          {/* Sub-Specialties */}
          <div className="space-y-1.5 sm:col-span-2">
            {primaryCategoryId && !isSpecialtiesLoading && specialtyOptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-light bg-surface-tertiary px-4 py-3 text-sm text-text-muted">
                {isRtl
                  ? "لا توجد تخصصات فرعية متاحة لهذا التخصص الأساسي."
                  : "No sub-specialties are available for this primary specialty."}
              </div>
            ) : (
              <MultiSelect
                label={isRtl ? "التخصصات الفرعية" : "Sub-specialties"}
                options={specialtyOptions.map((s) => ({
                  value: s.value,
                  text: s.label,
                  selected: validSelectedSpecialtyIds.includes(s.value),
                }))}
                defaultSelected={validSelectedSpecialtyIds}
                onChange={(vals) => handleFieldChange({ selectedSpecialtyIds: vals })}
                placeholder={
                  primaryCategoryId
                    ? isRtl
                      ? "اختر التخصصات الفرعية..."
                      : "Select sub-specialties..."
                    : isRtl
                      ? "يرجى اختيار التخصص الأساسي أولاً"
                      : "Please select a primary specialty first"
                }
                disabled={!primaryCategoryId}
              />
            )}
          </div>

          {/* Brief Bio */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bio">
              {isRtl ? "نبذة تعريفية مختصرة عن مسيرتك" : "Brief Professional Statement"} <span className="text-danger">*</span>
            </Label>
            <TextArea
              id="bio"
              rows={3}
              value={bio}
              onChange={(val) => handleFieldChange({ bio: val })}
              placeholder={
                isRtl
                  ? "اكتب ملخصاً موجزاً عن خلفيتك الأكاديمية والمهنية ومجالات عملك..."
                  : "Write a brief summary of your academic background and clinical experience..."
              }
            />
          </div>
        </div>
      </SurfaceCard>

      {/* SECTION 3: Required Documents */}
      <SurfaceCard variant="section" className="space-y-5 p-6">
        <SurfaceHeader
          eyebrow={isRtl ? "القسم الثالث" : "Section 3"}
          title={isRtl ? "المستندات المهنية المطلوبة" : "Required Verification Documents"}
          description={
            isRtl
              ? "مستندات التحقق المهني المطلوبة لمراجعة الأهلية والاعتماد."
              : "Official documents required to verify your medical/counseling eligibility."
          }
        />

        <PractitionerDocumentsSection countryCode={countryCode} />
      </SurfaceCard>

      {/* SUBMISSION BAR */}
      <SurfaceCard
        variant="section"
        className={`sticky bottom-4 z-20 border p-5 shadow-xl transition-all ${
          readiness?.canSubmitApplication
            ? "border-emerald-300 bg-surface-primary dark:border-emerald-800"
            : "border-amber-200 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/20"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            {readiness?.canSubmitApplication ? (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{isRtl ? "كافة بيانات ومستندات الطلب مكتملة" : "All application requirements complete"}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  <span>{isRtl ? "متطلبات متبقية قبل تقديم الطلب:" : "Items to complete before submitting:"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-text-secondary dark:text-white/70">
                  {missingRequirementsList.map((req) => (
                    <span
                      key={req}
                      className="rounded-md bg-amber-100/80 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                    >
                      • {getMissingRequirementLabel(req)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-text-muted">
              {isRtl
                ? "مراجعة الطلب تتم خلال يوم عمل واحد (24 ساعة) بواسطة فريق سويّة الطبي والإداري."
                : "Applications are reviewed within 1 business day by the Sawiyaa medical review team."}
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            disabled={!readiness?.canSubmitApplication || submitMutation.isPending}
            className="gap-2 shrink-0 font-bold px-8 shadow-md"
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isRtl ? "إرسال الطلب للمراجعة" : "Submit Application"}
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
