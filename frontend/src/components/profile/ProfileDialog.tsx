import type { Dispatch, SetStateAction } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import ProfileCard from "./ProfileCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import PersonalInfoForm from "./PersonalInfoForm";
import PreferencesForm from "./PreferencesForm";
import PrivacySettings from "./PrivacySettings";
import type { User } from "@/types/user";

interface ProfileDialogProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const ProfileDialog = ({ open, setOpen }: ProfileDialogProps) => {
  const { user, setUser } = useAuthStore();

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[min(620px,calc(100vh-2rem))] max-w-[calc(100%-2rem)] overflow-hidden p-0 border-border/40 bg-transparent shadow-2xl sm:max-w-3xl">
        <div className="h-full bg-gradient-glass">
          <div className="mx-auto flex h-full max-w-3xl flex-col p-3 sm:p-4">
            <DialogHeader className="mb-3">
              <DialogTitle className="text-xl font-bold text-foreground">
                Hồ sơ & Cài đặt
              </DialogTitle>
            </DialogHeader>
            <ProfileCard user={user} />
            <Tabs defaultValue="personal" className="mt-3 min-h-0 flex-1">
              <TabsList className="grid h-9 w-full grid-cols-3 glass-light">
                <TabsTrigger
                  value="personal"
                  className="data-[state=active]:glass-strong"
                >
                  Tài Khoản
                </TabsTrigger>
                <TabsTrigger
                  value="preferences"
                  className="data-[state=active]:glass-strong"
                >
                  Cấu Hình
                </TabsTrigger>
                <TabsTrigger
                  value="privacy"
                  className="data-[state=active]:glass-strong"
                >
                  Bảo Mật
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-2">
                <PersonalInfoForm userInfo={user} onUpdate={handleUserUpdate} />
              </TabsContent>

              <TabsContent value="preferences" className="mt-2">
                <PreferencesForm userInfo={user} />
              </TabsContent>

              <TabsContent
                value="privacy"
                className="mt-2 max-h-[360px] overflow-y-auto pr-1"
              >
                <PrivacySettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
