interface AuthSubmitMessageProps {
  message: string | null;
  tone?: "error" | "success";
}

export function AuthSubmitMessage({ message, tone = "error" }: AuthSubmitMessageProps) {
  if (!message) return null;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
        tone === "error"
          ? "border-red-400/20 bg-red-400/10 text-red-300"
          : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
      }`}
    >
      {message}
    </p>
  );
}
