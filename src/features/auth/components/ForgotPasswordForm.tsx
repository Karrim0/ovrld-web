"use client";

import { getArabicErrorMessage } from "@/lib/localization";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../schemas/forgot-password.schema";
import { sendPasswordResetEmail } from "../services/auth.service";
import { AuthSubmitMessage } from "./AuthSubmitMessage";

export interface ForgotPasswordFormProps {
  onSubmit?: (data: ForgotPasswordInput) => Promise<void> | void;
}

export function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function submit(data: ForgotPasswordInput) {
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      if (onSubmit) {
        await onSubmit(data);
        return;
      }

      const { error } = await sendPasswordResetEmail(data);
      if (error) throw error;

      setSuccessMessage("لو الإيميل ده عليه حساب، بعتنالك لينك تغيير الباسورد.");
    } catch (error) {
      setSubmitError(getArabicErrorMessage(error, "معرفناش نبعت لينك تغيير الباسورد."));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-neutral-300">
          الإيميل
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="gc-input"
          {...register("email")}
        />
        {errors.email ? <p className="mt-1.5 text-xs font-semibold text-red-400">{errors.email.message}</p> : null}
      </div>

      <AuthSubmitMessage message={submitError} />
      <AuthSubmitMessage message={successMessage} tone="success" />

      <button type="submit" disabled={isSubmitting} className="gc-primary-button mt-1 w-full disabled:cursor-not-allowed disabled:opacity-50">
        {isSubmitting ? "بنبعت…" : "ابعت لينك التغيير"}
      </button>

      <Link href="/login" className="text-sm font-bold text-neutral-400 transition hover:text-emerald-300">
        ارجع لتسجيل الدخول
      </Link>
    </form>
  );
}
