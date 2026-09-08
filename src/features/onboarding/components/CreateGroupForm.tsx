"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGroupSchema, type CreateGroupInput } from "@/features/groups/schemas/create-group.schema";
import { createGroup } from "@/features/groups/services/group.service";

export interface CreateGroupFormProps {
  onSubmit?: (data: CreateGroupInput) => Promise<void> | void;
}

export function CreateGroupForm({ onSubmit }: CreateGroupFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupInput>({ resolver: zodResolver(createGroupSchema) });

  async function submit(data: CreateGroupInput) {
    setSubmitError(null);

    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        await createGroup(data.name);
      }

      router.replace("/body-goal");
      router.refresh();
    } catch (error) {
      setSubmitError(getArabicErrorMessage(error, "معرفناش نعمل الجروب."));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-bold text-neutral-300">
          اسم الجروب
        </label>
        <input id="name" className="gc-input" {...register("name")} />
        {errors.name ? <p className="mt-1.5 text-xs font-semibold text-red-400">{errors.name.message}</p> : null}
      </div>
      {submitError ? <p role="alert" className="rounded-xl bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-300">{submitError}</p> : null}
      <button type="submit" disabled={isSubmitting} className="gc-primary-button w-full disabled:opacity-50">
        {isSubmitting ? "بنعمل الجروب…" : "اعمل الجروب"}
      </button>
    </form>
  );
}
