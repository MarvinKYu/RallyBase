import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100vh-65px)] items-center justify-center">
      <SignUp />
    </main>
  );
}
