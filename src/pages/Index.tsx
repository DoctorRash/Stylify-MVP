
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren, cardHover } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Tailor = Tables<"tailors">;

const Index = () => {
  const navigate = useNavigate();
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedTailors = async () => {
      try {
        const { data, error } = await supabase
          .from('tailors')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        setTailors(data || []);
      } catch (error) {
        console.error('Error loading tailors:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedTailors();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 py-12 sm:py-20"
      >
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center space-y-8 mb-16">
          <motion.div variants={fadeInUp} className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Stylify
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground">
              Connect with expert tailors and bring your style to life
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/signup">
              <Button size="lg" className="text-lg px-8 shadow-lg hover:shadow-xl transition-shadow">
                Get Started
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </motion.div>

          {/* Features */}
          <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">✂️</div>
              <h3 className="text-xl font-semibold mb-2">Expert Tailors</h3>
              <p className="text-muted-foreground">
                Connect with professional tailors in your area
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👔</div>
              <h3 className="text-xl font-semibold mb-2">Custom Designs</h3>
              <p className="text-muted-foreground">
                Preview your style with AI-powered try-on technology
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">Simple Ordering</h3>
              <p className="text-muted-foreground">
                Easy measurement submission and order tracking
              </p>
            </div>
          </motion.div>
        </div>

        {/* Featured Tailors Section */}
        {!loading && tailors.length > 0 && (
          <motion.div variants={fadeInUp} className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Featured Tailors</h2>
                <p className="text-muted-foreground mt-1">Discover talented tailors ready to create for you</p>
              </div>
              <Button variant="ghost" onClick={() => navigate('/customer/explore')}>
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tailors.map((tailor) => (
                <motion.div key={tailor.id} variants={cardHover} whileHover="hover" initial="rest">
                  <Card 
                    className="h-full cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/tailor/${tailor.slug}`)}
                  >
                    <CardHeader className="pb-2">
                      {tailor.profile_image_url ? (
                        <img
                          src={tailor.profile_image_url}
                          alt={tailor.business_name}
                          className="w-full h-40 object-cover rounded-lg mb-4"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg mb-4 flex items-center justify-center">
                          <span className="text-4xl">✂️</span>
                        </div>
                      )}
                      <CardTitle className="text-xl">{tailor.business_name}</CardTitle>
                      <div className="flex items-center justify-between">
                        {tailor.location && (
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {tailor.location}
                          </p>
                        )}
                        {tailor.average_rating && Number(tailor.average_rating) > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-accent text-accent" />
                            <span className="text-sm font-semibold">{Number(tailor.average_rating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {tailor.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{tailor.bio}</p>
                      )}
                      
                      {tailor.specialties && tailor.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tailor.specialties.slice(0, 3).map((specialty, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{specialty}</Badge>
                          ))}
                        </div>
                      )}

                      <Button className="w-full mt-2" variant="outline" size="sm">
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {tailors.length >= 6 && (
              <div className="text-center mt-8">
                <Button onClick={() => navigate('/customer/explore')} variant="outline" size="lg">
                  Browse All Tailors
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tailors...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Index;
