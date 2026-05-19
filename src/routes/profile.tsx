import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { RouteError } from "@/components/ui/route-error";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  User,
  Mail,
  Lock,
  Shield,
  ArrowLeft,
  LogOut,
  CheckCircle,
  GraduationCap,
  MessageSquare,
  LifeBuoy,
} from "lucide-react";

const LEARNING_STYLES = [
  "Visual",
  "Step-by-step",
  "Examples-first",
  "Conceptual / big-picture",
  "Practice-heavy",
];
const TONES = [
  "Encouraging",
  "Direct & concise",
  "Detailed",
  "Socratic (asks me questions)",
  "Playful",
];

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ScholarX" },
      {
        name: "description",
        content:
          "Manage your ScholarX account settings, email, password, and two-factor authentication.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { mode: "signin" as const } });
  },
  errorComponent: RouteError,
  component: ProfilePage,
});

function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "learning" | "security">("profile");

  // Personalization — fed into the AI tutor's system prompt server-side.
  const [gradeLevel, setGradeLevel] = useState("");
  const [learningStyle, setLearningStyle] = useState("");
  const [explanationTone, setExplanationTone] = useState("");
  const [studyGoals, setStudyGoals] = useState("");
  const [interests, setInterests] = useState("");
  const [personalizationLoading, setPersonalizationLoading] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email change states
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const navigate = useNavigate();

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
          .select(
            "display_name, grade_level, learning_style, explanation_tone, study_goals, interests",
          )
          .eq("id", userData.user.id)
          .maybeSingle();

        setDisplayName(profile?.display_name || userData.user.email?.split("@")[0] || "");
        setGradeLevel(profile?.grade_level ?? "");
        setLearningStyle(profile?.learning_style ?? "");
        setExplanationTone(profile?.explanation_tone ?? "");
        setStudyGoals(profile?.study_goals ?? "");
        setInterests(profile?.interests ?? "");
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

  async function savePersonalization() {
    setPersonalizationLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please sign in again");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          grade_level: gradeLevel.trim() || null,
          learning_style: learningStyle || null,
          explanation_tone: explanationTone || null,
          study_goals: studyGoals.trim() || null,
          interests: interests.trim() || null,
        })
        .eq("id", userData.user.id);

      if (error) {
        toast.error("Failed to save personalization");
        console.error(error);
        return;
      }
      toast.success("Personalization saved — your tutor will adapt to this");
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setPersonalizationLoading(false);
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

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // Validate password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      toast.error("Password must contain uppercase letters, lowercase letters, and numbers");
      return;
    }

    setPasswordLoading(true);
    try {
      // First verify current password by signing in
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        toast.error("User session expired. Please sign in again.");
        return;
      }

      // Supabase enforces current password server-side when enabled in Auth settings.
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: currentPassword,
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
    if (!newEmail) {
      toast.error("Please enter a new email address");
      return;
    }

    if (!newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback?type=email_change` },
      );

      if (error) {
        toast.error(error.message || "Failed to update email");
        console.error(error);
        return;
      }

      toast.success("Email update initiated. Please check your inbox to confirm.");
      setNewEmail("");
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setEmailLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
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
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/chat">
              <ArrowLeft className="h-4 w-4" />
            </Link>
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
                onClick={() => setActiveTab("learning")}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                  activeTab === "learning"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Learning
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
              <Button variant="ghost" asChild className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
                <Link to="/chat">
                  <MessageSquare className="h-4 w-4" />
                  Back to app
                </Link>
              </Button>
              <Button variant="ghost" asChild className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
                <Link to="/support">
                  <LifeBuoy className="h-4 w-4" />
                  Help &amp; Support
                </Link>
              </Button>
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
                      <Input id="email" value={email} disabled className="mt-1 bg-muted/30" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Email changes are handled in the Security tab
                      </p>
                    </div>
                  </div>

                  <Button onClick={updateDisplayName} disabled={loading} className="w-full mt-6">
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

            {activeTab === "learning" && (
              <div className="glass rounded-xl p-6 space-y-6">
                <div>
                  <h2 className="mb-1 text-xl font-semibold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Personalize your tutor
                  </h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    The AI tutor uses this to adapt explanations, difficulty, and examples to you.
                    Everything here is optional.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="grade-level">Grade / level</Label>
                      <Input
                        id="grade-level"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        placeholder="e.g. Year 11, AP Chemistry, 2nd-year undergrad"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="learning-style">Preferred learning style</Label>
                      <select
                        id="learning-style"
                        value={learningStyle}
                        onChange={(e) => setLearningStyle(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                      >
                        <option value="">No preference</option>
                        {LEARNING_STYLES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="explanation-tone">Explanation tone</Label>
                      <select
                        id="explanation-tone"
                        value={explanationTone}
                        onChange={(e) => setExplanationTone(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                      >
                        <option value="">No preference</option>
                        {TONES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="study-goals">Current goals</Label>
                      <Textarea
                        id="study-goals"
                        value={studyGoals}
                        onChange={(e) => setStudyGoals(e.target.value)}
                        placeholder="e.g. Pass my June biology final; get comfortable with calculus before college"
                        className="mt-1 min-h-[80px]"
                        maxLength={600}
                      />
                    </div>

                    <div>
                      <Label htmlFor="interests">Interests (used for analogies & examples)</Label>
                      <Input
                        id="interests"
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        placeholder="e.g. football, video games, music production"
                        className="mt-1"
                        maxLength={300}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={savePersonalization}
                    disabled={personalizationLoading}
                    className="w-full mt-6"
                  >
                    {personalizationLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Save personalization
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
                    className="w-full mt-6"
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

                    <p className="text-xs text-muted-foreground">
                      We'll send a confirmation link to both your old and new address. The change
                      only takes effect once confirmed.
                    </p>
                  </div>

                  <Button onClick={changeEmail} disabled={emailLoading} className="w-full mt-6">
                    {emailLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Update Email
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
