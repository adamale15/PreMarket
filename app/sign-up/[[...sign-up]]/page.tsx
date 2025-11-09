import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background gradient overlays matching main page - more visible */}
      <div className="absolute inset-0 -z-10 opacity-80 dark:opacity-40 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-400 dark:bg-fuchsia-500/60 blur-3xl animate-pulse" />
        <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-violet-500 dark:bg-violet-600/60 blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/2 h-60 w-60 rounded-full bg-blue-400 dark:bg-blue-500/40 blur-3xl animate-pulse delay-2000" />
      </div>
      
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto w-full max-w-md z-10",
            card: "backdrop-blur-xl bg-background/90 dark:bg-background/70 border border-border/50 shadow-2xl rounded-2xl",
            headerTitle: "text-foreground font-bold text-2xl",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: 
              "border border-border/50 bg-background/50 dark:bg-background/30 text-foreground hover:bg-background/70 dark:hover:bg-background/50 transition-all duration-300",
            socialButtonsBlockButtonText: "text-foreground font-medium",
            formButtonPrimary: 
              "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300",
            formFieldInput: 
              "bg-background/50 dark:bg-background/30 border-border/50 text-foreground placeholder:text-muted-foreground/50",
            formFieldLabel: "text-foreground",
            formFieldOptionalIndicator: "text-muted-foreground/60",
            formFieldSuccessText: "text-primary",
            formFieldErrorText: "text-destructive",
            formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
            formFieldInputShowPasswordIcon: "text-foreground",
            passwordStrengthMeterFill: "bg-primary",
            passwordStrengthText: "text-muted-foreground",
            footerActionLink: "text-primary hover:text-primary/80 font-medium",
            footer: "bg-background/30 dark:bg-background/20 border-t border-border/30",
            identityPreviewEditButton: "text-primary hover:text-primary/80",
            formResendCodeLink: "text-primary hover:text-primary/80",
            otpCodeFieldInput: "bg-background/50 dark:bg-background/30 border-border/50 text-foreground",
          },
          variables: {
            colorPrimary: "hsl(266 83% 58%)",
            colorBackground: "hsl(var(--background))",
            colorInputBackground: "hsl(var(--background))",
            colorInputText: "hsl(var(--foreground))",
            colorDanger: "hsl(var(--destructive))",
            colorSuccess: "hsl(142 76% 36%)",
            borderRadius: "0.75rem",
          },
        }}
        routing="path"
        path="/sign-up"
      />
    </div>
  );
}

