import { RoleChooser } from "@/components/app/role-chooser";
import { safeNext } from "@/lib/navigation";

export default async function RolePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <RoleChooser next={safeNext(params.next)} />;
}
