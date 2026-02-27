import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserByClerkId } from "@/db/queries";
import { runAgent } from "@/lib/agent";

export async function POST() {
  const isCron = process.env.CRON_SECRET;
  //2 jobs
  //1 manual run job
  //2. auto run job - cron
  if (!isCron) {
    //auth
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    //get the clerk user by id
    const user = await getUserByClerkId(clerkId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.agentEnabled) {
      return NextResponse.json(
        { error: "Agent is not enabled" },
        { status: 403 },
      );
    }

    //runAgent
    const result = await runAgent(user.id);
    return NextResponse.json(result);
  }

  //cron job
  //get the clerk user by id
  //runAgent
  return NextResponse.json({ message: "Cron job Agent run successful" });
}
