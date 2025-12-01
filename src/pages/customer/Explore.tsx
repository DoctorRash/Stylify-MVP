import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, cardHover } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, DollarSign, LogOut } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { NotificationBell } from "@/components/NotificationBell";

type Tailor = Tables<"tailors">;

const CustomerExplore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [filteredTailors, setFilteredTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (userData?.role !== 'customer') {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This page is only for customers."
        });
        navigate('/');
        return;
      }

      loadTailors();
    };

    checkAuth();
  }, [navigate, toast]);

  const loadTailors = async () => {
    try {
      // Fetch all tailors (no verification check)
      const { data, error } = await supabase
        .from('tailors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTailors(data || []);
      setFilteredTailors(data || []);
    } catch (error) {
      console.error('Error loading tailors:', error);
      toast({
        variant: "destructive",
        title: "Failed to load tailors",
        description: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = tailors;

    if (searchTerm) {
      filtered = filtered.filter(tailor =>
        tailor.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tailor.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (locationFilter) {
      filtered = filtered.filter(tailor =>
        tailor.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredTailors(filtered);
  }, [searchTerm, locationFilter, tailors]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading tailors...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Explore Tailors</h1>
            <p className="text-muted-foreground">Discover talented tailors in your area</p>
          </div>
          <div className="flex gap-2">
            <NotificationBell />
            <Button onClick={() => navigate('/customer/orders')} variant="outline">
              My Orders
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tailors Grid */}
        {filteredTailors.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No tailors found. Try adjusting your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTailors.map((tailor) => (
              <motion.div key={tailor.id} variants={cardHover} whileHover="hover" initial="rest">
                <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    {tailor.profile_image_url && (
                      <img
                        src={tailor.profile_image_url}
                        alt={tailor.business_name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <CardTitle className="text-xl">{tailor.business_name}</CardTitle>
                    {tailor.location && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {tailor.location}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {tailor.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{tailor.bio}</p>
                    )}
                    
                    {tailor.specialties && tailor.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tailor.specialties.map((specialty, idx) => (
                          <Badge key={idx} variant="secondary">{specialty}</Badge>
                        ))}
                      </div>
                    )}

                    {tailor.price_range && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        {tailor.price_range}
                      </div>
                    )}

                    <Button 
                      className="w-full" 
                      onClick={() => navigate(`/tailor/${tailor.slug}`)}
                    >
                      View Profile
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CustomerExplore;
