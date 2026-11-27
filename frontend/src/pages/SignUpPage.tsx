import { SignupForm } from "@/components/auth/signup-form";

const SignUpPage = () => {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center absolute inset-0 z-0 overflow-y-auto p-4 sm:p-6 bg-gradient-purple">
      <div className="w-full max-w-[760px]">
        <SignupForm />
      </div>
    </div>
  );
};

export default SignUpPage;
