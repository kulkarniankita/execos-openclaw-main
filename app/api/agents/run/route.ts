import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserByClerkId, getUsersWithAgentEnabled } from "@/db/queries";
import { runAgent } from "@/lib/agent";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("authorization");
  const isCron =
    process.env.CRON_SECRET &&
    cronSecret === `Bearer ${process.env.CRON_SECRET}`;
  //2 jobs

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
  const results = [];
  const eligibleUsers = await getUsersWithAgentEnabled();
  for (const { userId } of eligibleUsers) {
    const result = await runAgent(userId);
    results.push({
      userId: userId,
      status: result.status,
      summary: result.summary,
    });
  }
  return NextResponse.json({ results, processedCount: results.length });
}
