import PatientSignUpForm from "@/components/auth/PatientSignUpForm";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function PatientSignUpPage({ searchParams }: Props) {
  const { callbackUrl } = await searchParams;
  return <PatientSignUpForm callbackUrl={callbackUrl ?? null} />;
}
