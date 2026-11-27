import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "../ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router";
import { useState } from "react";
import LegalDialog from "./LegalDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { authService } from "@/services/authService";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";

const signInSchema = z.object({
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SigninForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn, setAccessToken, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [legalDialog, setLegalDialog] = useState<"terms" | "privacy" | null>(
    null,
  );
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<{
    challengeToken: string;
    email: string;
  } | null>(null);
  const [twoFactorOtp, setTwoFactorOtp] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormValues) => {
    const { username, password } = data;
    const result = await signIn(username, password);
    if (typeof result === "object" && result.requiresTwoFactor) {
      setTwoFactorChallenge({
        challengeToken: result.challengeToken,
        email: result.email,
      });
      setTwoFactorOtp("");
      return;
    }
    if (result === true) {
      navigate("/chat");
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (!twoFactorChallenge || twoFactorOtp.length !== 6) return;
    try {
      setTwoFactorLoading(true);
      const { accessToken } = await authService.verifyLoginTwoFactor(
        twoFactorChallenge.challengeToken,
        twoFactorOtp,
      );
      setAccessToken(accessToken);
      await fetchMe();
      useChatStore.getState().fetchConversations();
      toast.success("Đăng nhập thành công");
      setTwoFactorChallenge(null);
      navigate("/chat");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Xác thực hai bước thất bại",
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-border">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              {/*Header*/}
              <div className="flex flex-col items-center text-center gap-2">
                <a href="/" className="mx-auto block w-fit text-center">
                  <img src="/logo.svg" alt="logo" />
                </a>

                <h1 className="text-2xl font-bold">ĐĂNG NHẬP</h1>
                <p className="text-muted-foreground text-balance">
                  Đăng nhập vào tài khoản của bạn
                </p>
              </div>

              {/*username*/}
              <div className="flex flex-col gap-3">
                <Label htmlFor="username" className="block text-sm">
                  Tên đăng nhập
                </Label>
                <Input type="text" id="username" {...register("username")} />
                {errors.username && (
                  <p className="error-message">{errors.username.message}</p>
                )}
              </div>
              {/*password */}
              <div className="flex flex-col gap-3">
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
              {/*nút đăng nhập */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Đăng nhập
              </Button>
              <div className="text-center text-sm">
                Chưa có tài khoản?{" "}
                <a href="/signup" className="underline underline-offset-4">
                  Đăng ký
                </a>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholder.png"
              alt="Image"
              className="absolute top-1/2 -translate-y-1/2 object-cover "
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-xs text-balance px-6 text-center *:[a]:hover:text-primary text-muted-foreground *:[a]:underline *:[a]:underline-offset-4">
        Bằng cách nhấp vào tiếp tục, bạn đồng ý với{" "}
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
      </div>
      {legalDialog && (
        <LegalDialog
          open
          document={legalDialog}
          onOpenChange={(open) => {
            if (!open) setLegalDialog(null);
          }}
        />
      )}
      <Dialog
        open={twoFactorChallenge !== null}
        onOpenChange={(open) => {
          if (!open && !twoFactorLoading) setTwoFactorChallenge(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác thực hai bước</DialogTitle>
            <DialogDescription>
              Nhập mã OTP 6 chữ số đã gửi đến{" "}
              <strong>{twoFactorChallenge?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={twoFactorOtp}
            onChange={(event) =>
              setTwoFactorOtp(
                event.target.value.replace(/\D/g, "").slice(0, 6),
              )
            }
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.35em]"
            disabled={twoFactorLoading}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTwoFactorChallenge(null)}
              disabled={twoFactorLoading}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void handleVerifyTwoFactor()}
              disabled={twoFactorLoading || twoFactorOtp.length !== 6}
            >
              {twoFactorLoading ? "Đang xác minh..." : "Xác minh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
