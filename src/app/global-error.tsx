"use client";

import { ErrorState } from "@/components/feedback/ErrorState";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl" className="light h-full">
      <body className="min-h-full bg-background text-foreground">
        <ErrorState title="حصلت مشكلة في OVRLD" description={error.message} onRetry={reset} />
      </body>
    </html>
  );
}
