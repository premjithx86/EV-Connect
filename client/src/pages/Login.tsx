import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(email, password, displayName);
        toast({ title: "Account created successfully!" });
      } else {
        await login(email, password);
        toast({ title: "Welcome back!" });
      }
      setLocation("/");
    } catch (error) {
      toast({
        title: isRegister ? "Registration failed" : "Login failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary" />
              <span className="font-display font-bold text-2xl">EV Connect</span>
            </div>
          </div>
          <CardTitle>{isRegister ? "Create an account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {isRegister
              ? "Join the EV community today"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  data-testid="input-displayname"
                  placeholder="Alex Rivera"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? "Please wait..." : isRegister ? "Sign up" : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isRegister ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setIsRegister(!isRegister)}
              data-testid="button-toggle-mode"
            >
              {isRegister ? "Sign in" : "Sign up"}
            </button>
          </div>

          {!isRegister && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Demo Accounts:</p>
              <p className="text-muted-foreground">alice@evconnect.com / password123</p>
              <p className="text-muted-foreground">admin@evconnect.com / password123</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
