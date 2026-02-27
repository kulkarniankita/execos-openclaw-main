"use client";
import { useTransition } from "react";
import { Button } from "../ui/button";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

export function RunAgentButton() {
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const handleRunAgent = async () => {
    startTransition(async () => {
      try {
        // const agent = await runAgent();
        const response = await fetch("/api/agents/run", {
          method: "POST",
        });

        const result = await response.json();
        if (!response.ok) {
          console.error("Agent run failed", result.error);
        }
        console.log(result);

        router.refresh();
      } catch (error) {
        console.error("Agent run error:", error);
      }
    });
  };
  return (
    <Button
      className="w-full"
      variant={"outline"}
      onClick={handleRunAgent}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2Icon className="spinner-icon" />
          Running Agent...
        </>
      ) : (
        "Run Agent Now"
      )}
    </Button>
  );
}
