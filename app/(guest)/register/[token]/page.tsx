import { notFound } from "next/navigation";
import { validateToken } from "@/lib/services/linkService";
import { RegistrationForm } from "@/components/guest/RegistrationForm";

interface Props {
  params: { token: string };
}

export default async function RegisterPage({ params }: Props) {
  const { token } = await Promise.resolve(params);

  const inviteLink = await validateToken(token);
  if (!inviteLink) {
    notFound();
  }

  return <RegistrationForm token={token} />;
}

export async function generateMetadata({ params }: Props) {
  return {
    title: "Rezervacija — Adrenaline Camp Tara",
    description: "Popunite podatke za potvrdu rezervacije u Adrenaline Camp Tara.",
  };
}
