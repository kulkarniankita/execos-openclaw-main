import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrCreateUser } from "@/db/queries";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { HomeIcon, MailIcon, SettingsIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  //check if user is authenticated
  const { userId, has } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  //if not, redirect to login
  // if authenticated, show the children
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0].emailAddress ?? "";
  const name = clerkUser?.fullName ?? "";

  //getthe user from db or create the user in the db
  const user = await getOrCreateUser(userId, email, name);

  //isPaiduser

  const isPaidUser = has({ plan: "pro_plan" });

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: HomeIcon,
    },
    {
      label: "Monitoring",
      href: "/monitoring",
      icon: MailIcon,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: SettingsIcon,
    },
  ];

  return (
    <div className="layout-wrapper">
      <aside className="sidebar-container">
        <div className="sidebar-inner">
          <div className="logo-container">
            <Link href="/">
              <span className="logo-text">ExecOS</span>
            </Link>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link href={item.href} key={item.href}>
                <Button variant="ghost" className="sidebar-nav-button">
                  <item.icon className="sidebar-icon" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
          {!isPaidUser && (
            <div className="sidebar-section">
              <div className="upgrade-card">
                <div className="upgrade-card-header">
                  <ZapIcon className="sidebar-icon" />
                  <span className="font-semibold">Upgrade to Pro</span>
                </div>
                <p className="upgrade-card-text">Unlock autonomous AI agents</p>
                <Button variant="secondary" className="w-full" asChild>
                  <Link href="/#pricing">Upgrade Now</Link>
                </Button>
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <div className="user-profile">
              <UserButton />
              {isPaidUser && <Badge>Pro</Badge>}
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="main-content-inner">{children}</div>
      </main>
    </div>
  );
}
