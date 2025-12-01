import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, DollarSign, Phone, ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { z } from "zod";

type Tailor = Tables<"tailors">;
type Style = Tables<"styles">;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const orderSchema = z.object({
  customer_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  customer_phone: z.string().trim().min(10, "Valid phone number is required").max(20, "Phone number must be less than 20 characters"),
  customer_email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  fabric_type: z.string().trim().max(100).optional(),
  design_notes: z.string().trim().max(2000, "Notes must be less than 2000 characters").optional()
});

const PublicProfile = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tailor, setTailor] = useState<Tailor | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  const [orderForm, setOrderForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    fabric_type: "",
    design_notes: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('name, email, phone')
          .eq('id', session.user.id)
          .single();

        if (userData) {
          setOrderForm(prev => ({
            ...prev,
            customer_name: userData.name || "",
            customer_email: userData.email || "",
            customer_phone: userData.phone || ""
          }));
        }
      }
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
        navigate('/customer/explore');
      } finally {
        setLoading(false);
      }
    };

    loadTailorProfile();
  }, [slug, navigate, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const invalidFiles = files.filter(
      file => !ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
    );

    if (invalidFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid files",
        description: "Please upload only JPEG, PNG, or WebP images under 5MB each."
      });
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('order-references')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('order-references')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setReferenceImages(prev => [...prev, ...uploadedUrls]);
      toast({
        title: "Images uploaded",
        description: `${uploadedUrls.length} image(s) uploaded successfully.`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload images. Please try again."
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitOrder = async () => {
    if (!tailor) return;

    try {
      // Validate form data
      orderSchema.parse(orderForm);

      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from('orders')
        .insert({
          tailor_id: tailor.id,
          customer_name: orderForm.customer_name,
          customer_email: orderForm.customer_email || null,
          customer_phone: orderForm.customer_phone,
          fabric_type: orderForm.fabric_type || null,
          customer_user_id: session?.user.id || null,
          status: 'pending',
          photo_urls: referenceImages.length > 0 ? referenceImages : null,
          measurements: { notes: orderForm.design_notes }
        });

      if (error) throw error;

      toast({
        title: "Order placed successfully!",
        description: "The tailor will contact you soon."
      });

      setIsOrderDialogOpen(false);
      setOrderForm({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        fabric_type: "",
        design_notes: ""
      });
      setReferenceImages([]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.issues[0].message
        });
      } else {
        console.error('Error placing order:', error);
        toast({
          variant: "destructive",
          title: "Failed to place order",
          description: "Please try again later."
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

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

      <div className="max-w-7xl mx-auto px-8 -mt-32 relative z-10">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Profile Card */}
          <Card>
            <CardContent className="p-8">
              <Button
                variant="ghost"
                onClick={() => navigate('/customer/explore')}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Explore
              </Button>

              <div className="flex flex-col md:flex-row gap-8 items-start">
                {tailor.profile_image_url && (
                  <img
                    src={tailor.profile_image_url}
                    alt={tailor.business_name}
                    className="w-48 h-48 rounded-xl object-cover border-4 border-border"
                  />
                )}
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-4xl font-bold text-primary mb-2">{tailor.business_name}</h1>
                    {tailor.location && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {tailor.location}
                      </p>
                    )}
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
                      <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary" />
                        <span className="font-medium">{tailor.contact_whatsapp}</span>
                      </div>
                    )}
                  </div>

                  <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="mt-4">
                        Place an Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Place Your Order</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Your Name *</Label>
                          <Input
                            id="name"
                            value={orderForm.customer_name}
                            onChange={(e) => setOrderForm(prev => ({ ...prev, customer_name: e.target.value }))}
                            placeholder="Enter your full name"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={orderForm.customer_email}
                            onChange={(e) => setOrderForm(prev => ({ ...prev, customer_email: e.target.value }))}
                            placeholder="your.email@example.com"
                          />
                        </div>

                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={orderForm.customer_phone}
                            onChange={(e) => setOrderForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                            placeholder="+234 800 000 0000"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="fabric">Fabric Type</Label>
                          <Input
                            id="fabric"
                            value={orderForm.fabric_type}
                            onChange={(e) => setOrderForm(prev => ({ ...prev, fabric_type: e.target.value }))}
                            placeholder="e.g., Cotton, Silk, Lace"
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes">Design Notes</Label>
                          <Textarea
                            id="notes"
                            value={orderForm.design_notes}
                            onChange={(e) => setOrderForm(prev => ({ ...prev, design_notes: e.target.value }))}
                            placeholder="Describe what you'd like made..."
                            rows={4}
                          />
                        </div>

                        <div>
                          <Label htmlFor="photos">Reference Images (Optional)</Label>
                          <div className="mt-2 space-y-4">
                            {referenceImages.length > 0 && (
                              <div className="grid grid-cols-3 gap-2">
                                {referenceImages.map((url, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={url}
                                      alt={`Reference ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border-2 border-border"
                                    />
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeImage(index)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <label className="cursor-pointer">
                              <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors w-full justify-center">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {uploading ? 'Uploading...' : 'Upload Images (Max 5MB each)'}
                              </div>
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={uploading}
                              />
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Upload reference images of designs you'd like. Accepted formats: JPEG, PNG, WebP (Max 5MB each)
                            </p>
                          </div>
                        </div>

                        <Button onClick={handleSubmitOrder} className="w-full" disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Placing Order...
                            </>
                          ) : (
                            'Submit Order'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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
