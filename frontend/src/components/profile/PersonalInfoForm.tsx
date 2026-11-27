import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/user";
import { authService } from "@/services/authService";

type EditableField = {
  key: keyof Pick<User, "displayName" | "username" | "email" | "phone">;
  label: string;
  type?: string;
};

const PERSONAL_FIELDS: EditableField[] = [
  { key: "displayName", label: "Tên hiển thị" },
  { key: "username", label: "Tên người dùng" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Số điện thoại" },
];

type Props = {
  userInfo: User | null;
  onUpdate?: (updatedUser: User) => void;
};

const PersonalInfoForm = ({ userInfo, onUpdate }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: userInfo?.displayName ?? "",
    username: userInfo?.username ?? "",
    email: userInfo?.email ?? "",
    phone: userInfo?.phone ?? "",
    bio: userInfo?.bio ?? "",
  });

  if (!userInfo) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const updated = await authService.updateProfile({
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
      });

      toast.success("Cập nhật thông tin thành công");
      onUpdate?.(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-border/30 bg-card/95 py-0 shadow-sm">
      <CardHeader className="px-4 pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="size-4 text-primary" />
          Thông tin cá nhân
        </CardTitle>
        <CardDescription className="text-xs">
          Cập nhật chi tiết cá nhân và thông tin hồ sơ của bạn
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 rounded-b-2xl px-4 pb-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {PERSONAL_FIELDS.map(({ key, label, type }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key} className="text-xs">{label}</Label>
              <Input
                id={key}
                type={type ?? "text"}
                value={formData[key as keyof typeof formData]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="glass-light h-8 border-border/30"
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio" className="text-xs">Giới thiệu</Label>
          <Textarea
            id="bio"
            rows={1}
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            className="glass-light h-12 border-border/30 resize-none"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="h-9 w-full md:w-auto bg-gradient-primary hover:opacity-90 transition-opacity"
        >
          {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PersonalInfoForm;
