import { ResendConfirmationForm } from "@/components/resend-confirmation-form";
import { redirectIfAuthenticated } from "@/lib/auth";

export const metadata = { title: "Resend confirmation — Hustl" };

export default async function Page() {
  await redirectIfAuthenticated();
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ResendConfirmationForm />
      </div>
    </div>
  );
}
