import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center">
      <SignIn />
    </main>
  );
}
