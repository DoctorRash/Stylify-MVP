
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp, focusGlow } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["tailor", "customer"])
});

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer" as "tailor" | "customer"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signupSchema.parse(formData);
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: validated.name,
            role: validated.role
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Account created!",
        description: "Signing you in..."
      });

      // Navigate based on role
      if (validated.role === "tailor") {
        navigate("/tailor/dashboard");
      } else {
        navigate("/customer/explore");
      }
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
          title: "Signup Failed",
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
          <h1 className="text-4xl font-bold text-primary mb-2">Join Stylify</h1>
          <p className="text-muted-foreground">Create your account to get started</p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6 bg-card p-8 rounded-2xl shadow-lg border border-border"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <motion.div variants={focusGlow} whileFocus="focus">
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </motion.div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <motion.div variants={focusGlow} whileFocus="focus">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </motion.div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <motion.div variants={focusGlow} whileFocus="focus" className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 8 characters"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>
          </div>

          <div className="space-y-3">
            <Label>I am a...</Label>
            <RadioGroup
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as "tailor" | "customer" })}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary transition-colors">
                <RadioGroupItem value="customer" id="customer" />
                <Label htmlFor="customer" className="cursor-pointer flex-1">
                  Customer - Looking for tailoring services
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary transition-colors">
                <RadioGroupItem value="tailor" id="tailor" />
                <Label htmlFor="tailor" className="cursor-pointer flex-1">
                  Tailor - Offering tailoring services
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Signup;
