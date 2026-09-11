import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import {
  getWorkspaceMembers,
  getWorkspaceProjects,
} from "@/lib/workspace-repository";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, members] = await Promise.all([
    getWorkspaceProjects(),
    getWorkspaceMembers(),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <Topbar />

          <div className="px-5 py-8 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">Workspace</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                  Projects
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Track every active initiative across the team.
                </p>
              </div>

              <NewProjectDialog
                members={members.map((member) => ({
                  id: member.id,
                  name: member.name,
                  initials: member.initials,
                }))}
              />
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => {
                const projectMembers = members.filter((member) =>
                  project.memberIds.includes(member.id)
                );

                return (
                  <article
                    key={project.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {project.description}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                        {project.status}
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">
                          {project.completedTasks} / {project.totalTasks} tasks
                        </span>
                        <span className="font-medium text-zinc-300">
                          {project.progress}%
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {projectMembers.map((member) => (
                          <div
                            key={member.id}
                            title={member.name}
                            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-[10px] font-semibold"
                          >
                            {member.initials}
                          </div>
                        ))}
                      </div>

                      <button className="text-sm font-medium text-zinc-400 transition hover:text-white">
                        Open project →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
