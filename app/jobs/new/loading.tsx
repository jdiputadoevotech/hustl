import { FormSkeleton } from "@/components/shared/form-skeleton";

// Overrides app/jobs/loading.tsx, which would otherwise flash the browse grid.
export default function NewJobLoading() {
  return <FormSkeleton />;
}
