"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthState, useAuthActions } from "@/stores";
import { useTranslations } from "next-intl";

// Validation Schema
const registerSchema = z.object({
  businessName: z
    .string()
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(100, "الاسم طويل جداً"),
  slug: z
    .string()
    .min(3, "الـ Subdomain يجب أن يكون 3 أحرف على الأقل")
    .max(50, "الـ Subdomain طويل جداً")
    .regex(
      /^[a-z0-9-]+$/,
      "الـ Subdomain يجب أن يحتوي على أحرف صغيرة وأرقام وشرطات فقط"
    ),
  ownerName: z
    .string()
    .min(2, "الاسم يجب أن يكون حرفين على الأقل")
    .max(100, "الاسم طويل جداً"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z
    .string()
    .min(10, "رقم الهاتف غير صحيح")
    .regex(/^[+]?[0-9]+$/, "رقم الهاتف غير صحيح"),
  password: z
    .string()
    .min(6, "كلمة السر يجب أن تكون 6 أحرف على الأقل")
    .max(50, "كلمة السر طويلة جداً"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterBusinessForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("auth");
  const router = useRouter();

  // Use Zustand Auth Store - SSR-safe hooks
  const { isLoading } = useAuthState();
  const { register: registerBusiness } = useAuthActions();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessName: "",
      slug: "",
      ownerName: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  // Auto-generate slug from business name
  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("businessName", name);

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .substring(0, 50);
    setValue("slug", slug);
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);

    try {
      const result = await registerBusiness(data);

      if (result.success) {
        // Redirect to the admin area on success
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError(result.error || t("registrationError"));
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Registration error:", {
          name: err instanceof Error ? err.name : "UnknownError",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      setError(t("registrationError"));
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          {t("backToHome")}
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t("registerBusiness")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("registerBusinessDescription")}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">
              {/* Business Name */}
              <div>
                <Label>
                  {t("businessName")}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("businessNamePlaceholder")}
                  {...register("businessName")}
                  onChange={handleBusinessNameChange}
                  error={!!errors.businessName}
                />
                {errors.businessName && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              {/* Workspace slug */}
              <div>
                <Label>
                  {t("subdomain")}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="my-company"
                    {...register("slug")}
                    error={!!errors.slug}
                    className="flex-1"
                    dir="ltr"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">.fayed.app</span>
                </div>
                {errors.slug && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.slug.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {t("subdomainHint")}
                </p>
              </div>

              {/* Owner Name */}
              <div>
                <Label>
                  {t("ownerName")}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t("ownerNamePlaceholder")}
                  {...register("ownerName")}
                  error={!!errors.ownerName}
                />
                {errors.ownerName && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.ownerName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <Label>
                  {t("email")}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  {...register("email")}
                  error={!!errors.email}
                  dir="ltr"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <Label>
                  {t("phone")}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="tel"
                  placeholder="+201012345678"
                  {...register("phone")}
                  error={!!errors.phone}
                  dir="ltr"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <Label>
                  {t("password")}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder={t("passwordPlaceholder")}
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    error={!!errors.password}
                    dir="ltr"
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 text-sm text-error-500 bg-error-50 dark:bg-error-500/10 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-primary shadow-theme-xs hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {t("registering")}
                    </span>
                  ) : (
                    t("registerBusinessButton")
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              {t("alreadyHaveAccount")}{" "}
              <Link
                href="/signin"
                className="text-text-brand hover:text-primary-hover"
              >
                {t("signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
