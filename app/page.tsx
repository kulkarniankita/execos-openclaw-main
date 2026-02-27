import { Button } from "@/components/ui/button";
import {
  PricingTable,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="landing-wrapper">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="logo-container">
            <Link href="/">
              <span className="logo-text">ExecOS</span>
            </Link>
            <SignedIn>
              <div className="nav-actions">
                <Link href="/dashboard">
                  <Button variant="ghost"> Dashboard</Button>
                </Link>
                <UserButton />
              </div>
            </SignedIn>
            <SignedOut>
              <div className="nav-actions">
                <SignInButton />
                <SignUpButton />
              </div>
            </SignedOut>
          </div>
        </div>
      </header>
      <section className="section-heading">
        <h2>Simple, Transparent Pricing</h2>
        <PricingTable />
      </section>
    </div>
  );
}
