"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { joinGroupSchema, type JoinGroupInput } from "@/features/groups/schemas/join-group.schema";
import { joinGroupByInviteCode } from "@/features/groups/services/group.service";

export interface JoinGroupFormProps {
  onSubmit?: (data: JoinGroupInput) => Promise<void> | void;
}

export function JoinGroupForm({ onSubmit }: JoinGroupFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinGroupInput>({ resolver: zodResolver(joinGroupSchema) });

  async function submit(data: JoinGroupInput) {
    setSubmitError(null);

    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        await joinGroupByInviteCode(data.inviteCode);
      }

      router.replace("/onboarding");
      router.refresh();
    } catch (error) {
      setSubmitError(getArabicErrorMessage(error, "معرفناش ندخّلك الجروب."));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="inviteCode" className="mb-1.5 block text-sm font-bold text-neutral-300">
          كود الدعوة
        </label>
        <input
          id="inviteCode"
          autoCapitalize="characters"
          className="gc-input font-mono uppercase tracking-[0.2em]"
          {...register("inviteCode", {
            setValueAs: (value: string) => value.trim().toUpperCase(),
          })}
        />
        {errors.inviteCode ? <p className="mt-1.5 text-xs font-semibold text-red-400">{errors.inviteCode.message}</p> : null}
      </div>
      {submitError ? <p role="alert" className="rounded-xl bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-300">{submitError}</p> : null}
      <button type="submit" disabled={isSubmitting} className="gc-primary-button w-full disabled:opacity-50">
        {isSubmitting ? "بندخّلك الجروب…" : "ادخل الجروب"}
      </button>
    </form>
  );
}
