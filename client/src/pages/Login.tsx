import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const getSignupFromSearch = (): boolean => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("signup") === "true";
};

export default function Login() {
  const [location, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(() => getSignupFromSearch());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const previousModeRef = useRef(isRegister);

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setVehicleBrand("");
    setVehicleModel("");
    setVehicleYear("");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { history } = window;

    const syncMode = () => {
      setIsRegister(getSignupFromSearch());
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args as any);
      syncMode();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args as any);
      syncMode();
    };

    window.addEventListener("popstate", syncMode);
    syncMode();

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", syncMode);
    };
  }, []);

  useEffect(() => {
    if (previousModeRef.current !== isRegister) {
      resetForm();
      previousModeRef.current = isRegister;
    }
  }, [isRegister, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        // For now, we'll pass vehicle info in displayName as a workaround
        // In production, you'd update the register function to accept vehicle info
        await register(email, password, displayName);
        toast({ title: "Account created successfully!" });
      } else {
        await login(email, password);
        toast({ title: "Welcome back!" });
      }
      // Router will detect the auth state change and redirect
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
              <>
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
                <div className="space-y-2">
                  <Label htmlFor="vehicleBrand">EV Brand</Label>
                  <Select value={vehicleBrand} onValueChange={setVehicleBrand}>
                    <SelectTrigger id="vehicleBrand">
                      <SelectValue placeholder="Select your EV brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tesla">Tesla</SelectItem>
                      <SelectItem value="Rivian">Rivian</SelectItem>
                      <SelectItem value="Lucid">Lucid</SelectItem>
                      <SelectItem value="Ford">Ford</SelectItem>
                      <SelectItem value="Chevrolet">Chevrolet</SelectItem>
                      <SelectItem value="BMW">BMW</SelectItem>
                      <SelectItem value="Mercedes-Benz">Mercedes-Benz</SelectItem>
                      <SelectItem value="Audi">Audi</SelectItem>
                      <SelectItem value="Volkswagen">Volkswagen</SelectItem>
                      <SelectItem value="Hyundai">Hyundai</SelectItem>
                      <SelectItem value="Kia">Kia</SelectItem>
                      <SelectItem value="Nissan">Nissan</SelectItem>
                      <SelectItem value="Polestar">Polestar</SelectItem>
                      <SelectItem value="Porsche">Porsche</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleModel">EV Model</Label>
                  <Input
                    id="vehicleModel"
                    placeholder="Model 3, Mustang Mach-E, etc."
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicleYear">Year</Label>
                  <Input
                    id="vehicleYear"
                    type="number"
                    placeholder="2024"
                    min="2010"
                    max="2025"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                  />
                </div>
              </>
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
              onClick={() => {
                const targetSignup = !isRegister;
                setLocation(targetSignup ? "/login?signup=true" : "/login");
                setIsRegister(targetSignup);
              }}
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
              <p className="text-muted-foreground">vishnu@gmail.com / malayalam1#</p>
              <p className="text-muted-foreground">rasni@gmail.com / password123</p>
              <p className="text-muted-foreground">premjith@gmail.com / password123</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
