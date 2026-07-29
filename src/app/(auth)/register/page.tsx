import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div>
      <p className="gc-eyebrow">ابدأ تمرينك</p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em]">اعمل حسابك على OVRLD.</h1>
      <p className="mb-7 mt-2 text-sm leading-6 text-neutral-400">اتمرّن لوحدك أو مع صحابك، وتقدمك يفضل خاص بيك.</p>
      <RegisterForm />
    </div>
  );
}
