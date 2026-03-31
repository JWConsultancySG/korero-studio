import { Suspense } from "react";
import CreateClassWizard from "@/components/groups/CreateGroupWizard";
import { Loader2 } from "lucide-react";

function WizardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export default function NewClassPage() {
  return (
    <Suspense fallback={<WizardFallback />}>
      <CreateClassWizard />
    </Suspense>
  );
}
