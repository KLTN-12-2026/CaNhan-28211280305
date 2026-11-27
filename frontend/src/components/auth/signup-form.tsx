import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "../ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import OTPVerification from "./OTPVerification";
import api from "@/lib/axios";
import { useState } from "react";
import LegalDialog from "./LegalDialog";

const signUpSchema = z.object({
  firstName: z.string().min(1, "Tên bắt buộc phải có"),
  lastName: z.string().min(1, "Họ bắt buộc phải có"),
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  acceptedTerms: z.boolean().refine((value) => value, {
    message: "Bạn cần đồng ý với điều khoản và chính sách",
  }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [signupData, setSignupData] = useState<SignUpFormValues | null>(null);
  const [otpError, setOtpError] = useState("");
  const [legalDialog, setLegalDialog] = useState<"terms" | "privacy" | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      acceptedTerms: false,
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    const { firstName, lastName, username, email, password } = data;

    try {
      setOtpError("");
      const response = await api.post("/auth/signup", {
        username,
        password,
        email,
        firstName: firstName,
        lastName: lastName,
        acceptedTerms: data.acceptedTerms,
      });

      if (response.status === 200) {
        setSignupData(data);
        setShowOTPVerification(true);
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || "Đăng ký thất bại");
    }
  };

  const handleOTPVerified = () => {
    navigate("/signin");
  };

  if (showOTPVerification && signupData) {
    return (
      <OTPVerification
        email={signupData.email}
        onVerified={handleOTPVerified}
        signupData={signupData}
      />
    );
  }

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <Card className="overflow-hidden border-border shadow-xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-5 sm:p-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-4">
              {/*Header*/}
              <div className="flex flex-col items-center text-center gap-1">
                <a href="/" className="mx-auto block w-fit text-center">
                  <img src="/logo.svg" alt="logo" className="h-8 w-auto" />
                </a>

                <h1 className="text-xl font-bold sm:text-2xl">ĐĂNG KÝ</h1>
                <p className="text-sm text-muted-foreground text-balance">
                  Chào mừng bạn! Hãy đăng ký để bắt đầu
                </p>
              </div>
              {/*Họ và tên */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lastname" className="block text-sm">
                    Họ
                  </Label>
                  <Input type="text" id="lastname" {...register("lastName")} />
                  {errors.lastName && (
                    <p className="error-message">{errors.lastName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstname" className="block text-sm">
                    Tên
                  </Label>
                  <Input
                    type="text"
                    id="firstname"
                    {...register("firstName")}
                  />
                  {errors.firstName && (
                    <p className="error-message">{errors.firstName.message}</p>
                  )}
                </div>
              </div>
              {/*username*/}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username" className="block text-sm">
                  Tên đăng nhập
                </Label>
                <Input type="text" id="username" {...register("username")} />
                {errors.username && (
                  <p className="error-message">{errors.username.message}</p>
                )}
              </div>
              {/*email */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="block text-sm">
                  Email
                </Label>
                <Input type="text" id="email" {...register("email")} />
                {errors.email && (
                  <p className="error-message">{errors.email.message}</p>
                )}
              </div>
              {/*password */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="block text-sm">
                  Mật khẩu
                </Label>
                <Input
                  type="password"
                  id="password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="error-message">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    {...register("acceptedTerms")}
                  />
                  <span>
                    Tôi đã đọc và đồng ý với{" "}
                    <button
                      type="button"
                      className="underline underline-offset-4 hover:text-primary"
                      onClick={() => setLegalDialog("terms")}
                    >
                      Điều khoản dịch vụ
                    </button>{" "}
                    và{" "}
                    <button
                      type="button"
                      className="underline underline-offset-4 hover:text-primary"
                      onClick={() => setLegalDialog("privacy")}
                    >
                      Chính sách bảo mật
                    </button>
                    .
                  </span>
                </label>
                {errors.acceptedTerms && (
                  <p className="error-message">
                    {errors.acceptedTerms.message}
                  </p>
                )}
              </div>
              {/*nút đăng ký */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Đang gửi OTP..." : "Tiếp tục"}
              </Button>
              {otpError && <p className="text-sm text-red-500">{otpError}</p>}
              <div className="text-center text-sm">
                Đã có tài khoản?{" "}
                <a href="/signin" className="underline underline-offset-4">
                  Đăng nhập
                </a>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden min-h-[560px] md:block">
            <img
              src="/placeholderSignUp.png"
              alt="Image"
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
      {legalDialog && (
        <LegalDialog
          open
          document={legalDialog}
          onOpenChange={(open) => {
            if (!open) setLegalDialog(null);
          }}
        />
      )}
    </div>
  );
}
