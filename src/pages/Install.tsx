import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, Share, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { PremiumGate } from "@/components/PremiumGate";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallContent = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <SEO 
          title="App Installed - Creator Spoonful"
          description="Creator Spoonful app is installed on your device"
        />
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              Creator Spoonful is installed on your device. Open it from your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Go to Recipes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO 
        title="Install App - Creator Spoonful"
        description="Install Creator Spoonful on your device for quick access to Maharashtrian recipes"
      />
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Install Creator Spoonful</CardTitle>
          <CardDescription>
            Get quick access to authentic Maharashtrian recipes right from your home screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Works Offline</p>
                <p className="text-sm text-muted-foreground">Access recipes even without internet</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Fast & Lightweight</p>
                <p className="text-sm text-muted-foreground">No app store download needed</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Always Updated</p>
                <p className="text-sm text-muted-foreground">Get the latest recipes automatically</p>
              </div>
            </div>
          </div>

          {isIOS ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">To install on iPhone/iPad:</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">1</span>
                  <span>Tap the Share button</span>
                  <Share className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">2</span>
                  <span>Scroll down and tap "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">3</span>
                  <span>Tap "Add" to confirm</span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-5 h-5 mr-2" />
              Install App
            </Button>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">To install on your device:</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">1</span>
                  <span>Tap the menu button</span>
                  <MoreVertical className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">2</span>
                  <span>Tap "Install app" or "Add to Home Screen"</span>
                </div>
              </div>
            </div>
          )}

          <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
            Continue in Browser
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const Install = () => (
  <PremiumGate>
    <InstallContent />
  </PremiumGate>
);

export default Install;
