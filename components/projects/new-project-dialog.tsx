"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type MemberOption = {
  id: string;
  name: string;
  initials: string;
};

type NewProjectDialogProps = {
  members: MemberOption[];
};

export function NewProjectDialog({ members }: NewProjectDialogProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Planning");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      name.trim().length >= 3 &&
      description.trim().length >= 10 &&
      !submitting,
    [name, description, submitting]
  );

  function resetForm() {
    setName("");
    setDescription("");
    setStatus("Planning");
    setMemberIds([]);
    setError("");
  }

  function closeDialog() {
    if (submitting) return;
    setOpen(false);
    resetForm();
  }

  function toggleMember(memberId: string) {
    setMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status,
          memberIds,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload?.errors?.join(" ") ||
          payload?.message ||
          "Unable to create project.";

        setError(message);
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Something went wrong while creating the project.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
      >
        + New Project
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDialog();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
            className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
              <div>
                <h2 id="new-project-title" className="text-xl font-semibold">
                  Create project
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Add a real project to your workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg px-2 py-1 text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label htmlFor="project-name" className="text-sm font-medium text-zinc-300">
                  Project name
                </label>
                <input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Customer Portal"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </div>

              <div>
                <label htmlFor="project-description" className="text-sm font-medium text-zinc-300">
                  Description
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What are we building and why?"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
                <p className="mt-1 text-xs text-zinc-600">Minimum 10 characters.</p>
              </div>

              <div>
                <label htmlFor="project-status" className="text-sm font-medium text-zinc-300">
                  Status
                </label>
                <select
                  id="project-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-zinc-600"
                >
                  <option value="Planning">Planning</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-300">Project members</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {members.map((member) => {
                    const selected = memberIds.includes(member.id);

                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                          selected
                            ? "border-zinc-500 bg-zinc-800"
                            : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                        }`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-semibold">
                          {member.initials}
                        </span>
                        <span className="text-sm">{member.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition enabled:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
