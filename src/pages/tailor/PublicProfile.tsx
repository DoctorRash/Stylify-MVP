
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, DollarSign, Phone, ArrowLeft, Loader2, Star, UserPlus, Sparkles } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { OrderCreationWizard } from "@/components/OrderCreationWizard";

type Tailor = Tables<"tailors">;
type Style = Tables<"styles">;

const PublicProfile = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tailor, setTailor] = useState<Tailor | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const loadTailorProfile = async () => {
      if (!slug) return;

      try {
        const { data: tailorData, error: tailorError } = await supabase
          .from('tailors')
          .select('*')
          .eq('slug', slug)
          .single();

        if (tailorError) throw tailorError;
        setTailor(tailorData);

        const { data: stylesData, error: stylesError } = await supabase
          .from('styles')
          .select('*')
          .eq('tailor_id', tailorData.id)
          .order('created_at', { ascending: false });

        if (stylesError) throw stylesError;
        setStyles(stylesData || []);
      } catch (error) {
        console.error('Error loading tailor:', error);
        toast({
          variant: "destructive",
          title: "Tailor not found",
          description: "This tailor profile does not exist."
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadTailorProfile();
  }, [slug, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tailor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-br from-primary/20 to-accent/20">
        {tailor.profile_image_url && (
          <img
            src={tailor.profile_image_url}
            alt={tailor.business_name}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-32 relative z-10 pb-12">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="flex justify-between items-start mb-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                {!isAuthenticated && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/auth/signup')}
                    size="sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Account
                  </Button>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-start">
                {tailor.profile_image_url && (
                  <img
                    src={tailor.profile_image_url}
                    alt={tailor.business_name}
                    className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl object-cover border-4 border-border"
                  />
                )}

                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">{tailor.business_name}</h1>
                    <div className="flex flex-wrap items-center gap-4">
                      {tailor.location && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {tailor.location}
                        </p>
                      )}
                      {tailor.average_rating && tailor.average_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-accent text-accent" />
                          <span className="font-semibold">{Number(tailor.average_rating).toFixed(1)}</span>
                          <span className="text-muted-foreground">({tailor.review_count} reviews)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {tailor.bio && (
                    <p className="text-lg text-foreground">{tailor.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {tailor.specialties?.map((specialty, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        {specialty}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    {tailor.price_range && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <span className="font-medium">{tailor.price_range}</span>
                      </div>
                    )}
                    {tailor.contact_whatsapp && (
                      <a
                        href={`https://wa.me/${tailor.contact_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Phone className="w-5 h-5" />
                        <span className="font-medium">{tailor.contact_whatsapp}</span>
                      </a>
                    )}
                  </div>

                  {isAuthenticated ? (
                    <>
                      <Button
                        size="lg"
                        className="mt-4 gap-2"
                        onClick={() => setIsWizardOpen(true)}
                      >
                        <Sparkles className="w-5 h-5" />
                        Get Virtual Try-On
                      </Button>
                      <OrderCreationWizard
                        open={isWizardOpen}
                        onOpenChange={setIsWizardOpen}
                        tailorId={tailor.id}
                        tailorName={tailor.business_name}
                        styles={styles}
                      />
                    </>
                  ) : (
                    <Button
                      size="lg"
                      className="mt-4 gap-2"
                      onClick={() => navigate(`/auth/login?redirect=/tailor/${slug}`)}
                    >
                      <Sparkles className="w-5 h-5" />
                      Get Virtual Try-On
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Section */}
          {styles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={staggerChildren}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {styles.map((style) => (
                    <motion.div key={style.id} variants={fadeInUp}>
                      <Card className="overflow-hidden">
                        <img
                          src={style.image_url}
                          alt={style.title || "Portfolio item"}
                          className="w-full h-64 object-cover"
                        />
                        <CardHeader>
                          <CardTitle className="text-lg">{style.title}</CardTitle>
                        </CardHeader>
                        {style.description && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground">{style.description}</p>
                          </CardContent>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PublicProfile;
