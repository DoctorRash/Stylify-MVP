import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TailorDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', session.user.id)
        .single();

      if (userData?.role !== 'tailor') {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This page is only for tailors."
        });
        navigate('/');
        return;
      }

      setUserName(userData.name);

      // Check if profile exists
      const { data: tailorProfile } = await supabase
        .from('tailors')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!tailorProfile) {
        navigate('/tailor/profile-edit');
      }
    };

    checkAuth();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto space-y-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Tailor Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {userName}!</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-xl font-semibold mb-2">Orders</h3>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground">Total orders received</p>
            <Button
              onClick={() => navigate('/tailor/orders')}
              className="mt-2 w-full"
            >
              View Orders
            </Button>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-xl font-semibold mb-2">Portfolio</h3>
            <p className="text-3xl font-bold text-accent">0</p>
            <p className="text-sm text-muted-foreground">Style items</p>
            <Button
              onClick={() => navigate('/tailor/portfolio')}
              className="mt-2 w-full"
            >
              Manage Portfolio
            </Button>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-xl font-semibold mb-2">Profile</h3>
            <Button
              onClick={() => navigate('/tailor/profile-edit')}
              className="mt-2 w-full"
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TailorDashboard;
