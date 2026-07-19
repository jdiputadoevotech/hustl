import { FormSkeleton } from "@/components/shared/form-skeleton";

// Overrides app/jobs/[id]/loading.tsx, which would otherwise flash the job detail layout.
export default function EditJobLoading() {
  return <FormSkeleton />;
}
