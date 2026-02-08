import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setError("");
    setIsSubmitting(true);
    try {
      await login(data.username, data.password);
    } catch (err: any) {
      setError(err.message?.includes("401") ? "Invalid credentials" : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary text-primary-foreground font-bold text-lg mb-3">
            S
          </div>
          <h1 className="text-xl font-semibold" data-testid="text-login-title">Saaf Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Laundry Marketplace Admin</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Sign in to continue</h2>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="admin"
                  {...form.register("username")}
                  data-testid="input-username"
                />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter password"
                  {...form.register("password")}
                  data-testid="input-password"
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive text-center" data-testid="text-login-error">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="button-login"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
