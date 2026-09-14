import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/use-auth";
import { LedgerMark } from "@/components/LedgerMark";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ShieldCheck,
  UserRoundPlus,
  UserX,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

/** ترجمهٔ خطاهای رایج ارائه‌دهندهٔ گذرواژه به پیام فارسی روشن */
function friendlyAuthError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "خطای ناشناخته — دوباره تلاش کنید";
  const msg = raw.toLowerCase();
  if (msg.includes("invalid") && msg.includes("password")) {
    return "ایمیل یا گذرواژه نادرست است.";
  }
  if (msg.includes("invalid account") || msg.includes("not found")) {
    return "حسابی با این ایمیل پیدا نشد — ابتدا حساب بسازید.";
  }
  if (msg.includes("already") && (msg.includes("exist") || msg.includes("linked"))) {
    return "این ایمیل قبلاً ثبت شده — به «ورود» بروید.";
  }
  if (msg.includes("8") || msg.includes("requirement")) {
    return "گذرواژه باید حداقل ۸ نویسه باشد.";
  }
  return raw;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleCredentialsSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("password", {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        // ارائه‌دهندهٔ استاندارد Convex Auth: ساخت حساب یا ورود با گذرواژه —
        // هش Scrypt در بک‌اند ابری انجام می‌شود؛ هیچ تنظیمی لازم نیست.
        flow: mode,
      });
      navigate(redirect);
    } catch (error) {
      console.error("Credentials sign-in error:", error);
      setError(friendlyAuthError(error));
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `ورود به‌عنوان مهمان ناموفق بود: ${
          error instanceof Error ? error.message : "خطای ناشناخته"
        }`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* محتوا */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex h-full flex-col items-center justify-center">
          <Card className="min-w-[350px] border pb-0 shadow-none">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <button
                  type="button"
                  aria-label="درباره و نسخه‌ها"
                  className="mt-4 mb-4 text-foreground"
                  onClick={() => navigate("/about")}
                >
                  <LedgerMark className="size-14" />
                </button>
              </div>
              <CardTitle className="font-display text-2xl">
                {mode === "signIn" ? "خوش آمدید" : "ساخت حساب"}
              </CardTitle>
              <CardDescription>
                {mode === "signIn"
                  ? "با ایمیل و گذرواژه وارد شوید"
                  : "یک گذرواژه انتخاب کنید — بدون تأیید ایمیل"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCredentialsSubmit}>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-email">ایمیل</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="auth-email"
                        name="email"
                        placeholder="name@example.com"
                        type="email"
                        dir="ltr"
                        className="pl-9 text-left"
                        autoComplete="email"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-password">گذرواژه</Label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="auth-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        dir="ltr"
                        className="pl-9 pr-9 text-left"
                        autoComplete={
                          mode === "signUp" ? "new-password" : "current-password"
                        }
                        minLength={8}
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword ? "پنهان کردن گذرواژه" : "نمایش گذرواژه"
                        }
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {mode === "signUp" && (
                      <p className="text-xs text-muted-foreground">
                        حداقل ۸ نویسه — در بک‌اند به‌صورت رمزشده ذخیره می‌شود
                      </p>
                    )}
                  </div>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="mt-4 w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      در حال بررسی…
                    </>
                  ) : mode === "signIn" ? (
                    <>
                      ورود
                      <ArrowLeft className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      ساخت حساب
                      <UserRoundPlus className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="mt-3 text-center text-sm text-muted-foreground">
                  {mode === "signIn" ? "حساب ندارید؟ " : "قبلاً ثبت‌نام کرده‌اید؟ "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => {
                      setMode(mode === "signIn" ? "signUp" : "signIn");
                      setError(null);
                    }}
                    disabled={isLoading}
                  >
                    {mode === "signIn" ? "ساخت حساب" : "ورود"}
                  </Button>
                </p>

                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">
                        یا
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    ورود به‌عنوان مهمان
                  </Button>
                </div>
              </CardContent>
            </form>

            <div className="rounded-b-[4px] border-t bg-secondary/60 px-6 py-4 text-center text-xs text-muted-foreground">
              ورود با ایمیل و گذرواژه — بدون نیاز به هیچ سرویس ایمیل
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
