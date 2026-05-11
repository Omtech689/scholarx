import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Shield,
  ArrowLeft,
  LogOut,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: ProfilePage,
});

function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email change states
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // 2FA states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setEmail(userData.user.email || "");
        
        // Load profile data
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userData.user.id)
          .maybeSingle();
        
        setDisplayName(profile?.display_name || userData.user.email?.split("@")[0] || "");
      }
    } catch (err) {
      toast.error("Failed to load profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateDisplayName() {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please sign in again");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", userData.user.id);

      if (error) {
        toast.error("Failed to update display name");
        console.error(error);
        return;
      }

      toast.success("Display name updated");
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message || "Failed to update password");
        console.error(error);
        return;
      }

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function changeEmail() {
    if (!newEmail || !emailPassword) {
      toast.error("Please fill in all email fields");
      return;
    }

    if (!newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        toast.error(error.message || "Failed to update email");
        console.error(error);
        return;
      }

      toast.success("Email update initiated. Please check your inbox to confirm.");
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setEmailLoading(false);
    }
  }

  async function toggleTwoFactor() {
    setTwoFactorLoading(true);
    try {
      if (twoFactorEnabled) {
        // Disable 2FA (this would require additional Supabase configuration)
        toast.info("2FA disable feature coming soon");
      } else {
        // Enable 2FA (this would require additional Supabase configuration)
        toast.info("2FA setup feature coming soon");
      }
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left sidebar - Navigation */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl p-6 space-y-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  activeTab === "profile"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  activeTab === "security"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="h-4 w-4" />
                Security
              </button>
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2">
            {activeTab === "profile" && (
              <div className="glass rounded-xl p-6 space-y-6">
                <div>
                  <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="display-name">Display Name</Label>
                      <Input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={email}
                        disabled
                        className="mt-1 bg-muted/30"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Email changes are handled in the Security tab
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={updateDisplayName}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Update Profile
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Password Change */}
                <div className="glass rounded-xl p-6">
                  <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={changePassword}
                    disabled={passwordLoading}
                    className="w-full"
                  >
                    {passwordLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                </div>

                {/* Email Change */}
                <div className="glass rounded-xl p-6">
                  <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Change Email
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-email">New Email Address</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter new email address"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email-password">Current Password</Label>
                      <Input
                        id="email-password"
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={changeEmail}
                    disabled={emailLoading}
                    className="w-full"
                  >
                    {emailLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Update Email
                  </Button>
                </div>

                {/* 2FA/MFA */}
                <div className="glass rounded-xl p-6">
                  <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Two-Factor Authentication
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button
                        variant={twoFactorEnabled ? "destructive" : "default"}
                        onClick={toggleTwoFactor}
                        disabled={twoFactorLoading}
                      >
                        {twoFactorLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : twoFactorEnabled ? (
                          "Disable"
                        ) : (
                          "Enable"
                        )}
                      </Button>
                    </div>
                    
                    {!twoFactorEnabled && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">
                              2FA Setup Coming Soon
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                              We're working on bringing two-factor authentication to ScholarX. 
                              This will include authenticator apps and backup codes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
