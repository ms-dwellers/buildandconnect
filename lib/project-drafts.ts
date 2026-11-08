import { api } from "./api";
import type {
  ProjectDraftContent,
  ProjectDraftRecord,
} from "../backend/project-drafts";

export async function createProjectDraft(
  content: ProjectDraftContent,
  id = crypto.randomUUID(),
) {
  const response = await api<ProjectDraftRecord>("/project-drafts", {
    method: "POST",
    body: JSON.stringify({ id, content }),
  });
  if (!response.ok) throw new Error(response.error);
  return response.data;
}
