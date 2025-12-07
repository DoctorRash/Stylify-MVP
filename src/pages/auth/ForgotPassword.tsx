import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp, focusGlow } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().trim().email("Invalid email address")
});

const ForgotPassword = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = emailSchema.parse({ email });
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Reset link sent!",
        description: "Check your email for a password reset link."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.issues[0].message
        });
      } else if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Forgot Password</h1>
          <p className="text-muted-foreground">
            {sent ? "Check your inbox for the reset link" : "Enter your email to reset your password"}
          </p>
        </div>

        {sent ? (
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="bg-card p-8 rounded-2xl shadow-lg border border-border text-center space-y-6"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setSent(false)}
              className="w-full"
            >
              Try another email
            </Button>
            <Link to="/auth/login" className="text-sm text-primary hover:underline block">
              Back to login
            </Link>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6 bg-card p-8 rounded-2xl shadow-lg border border-border"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <motion.div variants={focusGlow} whileFocus="focus">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </motion.div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>

            <Link 
              to="/auth/login" 
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
