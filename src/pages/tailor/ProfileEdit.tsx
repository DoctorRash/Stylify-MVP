import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tailorId, setTailorId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    business_name: "",
    bio: "",
    location: "",
    specialties: [] as string[],
    price_range: "",
    contact_whatsapp: "",
    profile_image_url: ""
  });

  useEffect(() => {
    const loadProfile = async () => {
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

      if (userData?.role !== 'tailor') {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This page is only for tailors."
        });
        navigate('/');
        return;
      }

      const { data: tailorData } = await supabase
        .from('tailors')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (tailorData) {
        setTailorId(tailorData.id);
        setFormData({
          business_name: tailorData.business_name || "",
          bio: tailorData.bio || "",
          location: tailorData.location || "",
          specialties: tailorData.specialties || [],
          price_range: tailorData.price_range || "",
          contact_whatsapp: tailorData.contact_whatsapp || "",
          profile_image_url: tailorData.profile_image_url || ""
        });
      }
    };

    loadProfile();
  }, [navigate, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('tailor-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tailor-profiles')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, profile_image_url: publicUrl }));
      
      toast({
        title: "Image uploaded successfully",
        description: "Your profile image has been updated."
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload image. Please try again."
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name.trim()) {
      toast({
        variant: "destructive",
        title: "Business name required",
        description: "Please enter your business name."
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (tailorId) {
        const { error } = await supabase
          .from('tailors')
          .update({
            business_name: formData.business_name,
            bio: formData.bio,
            location: formData.location,
            specialties: formData.specialties,
            price_range: formData.price_range,
            contact_whatsapp: formData.contact_whatsapp,
            profile_image_url: formData.profile_image_url
          })
          .eq('id', tailorId);

        if (error) throw error;
      } else {
        const slug = await generateSlug(formData.business_name);
        
        const { error } = await supabase
          .from('tailors')
          .insert({
            user_id: session.user.id,
            business_name: formData.business_name,
            bio: formData.bio,
            location: formData.location,
            specialties: formData.specialties,
            price_range: formData.price_range,
            contact_whatsapp: formData.contact_whatsapp,
            profile_image_url: formData.profile_image_url,
            slug
          });

        if (error) throw error;
      }

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully."
      });

      navigate('/tailor/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Failed to save profile. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = async (businessName: string) => {
    const { data, error } = await supabase.rpc('generate_unique_slug', {
      business_name: businessName
    });
    
    if (error) {
      console.error('Slug generation error:', error);
      return businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    
    return data;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground">Set up your tailor business profile</p>
          </div>
          <Button onClick={() => navigate('/tailor/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl border border-border space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-image">Profile Image</Label>
              <div className="mt-2 flex items-center gap-4">
                {formData.profile_image_url && (
                  <img 
                    src={formData.profile_image_url} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="Enter your business name"
                required
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell customers about your tailoring expertise..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Lagos, Nigeria"
              />
            </div>

            <div>
              <Label htmlFor="specialties">Specialties (comma-separated)</Label>
              <Input
                id="specialties"
                value={formData.specialties.join(', ')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
                placeholder="e.g., Wedding dresses, Suits, Traditional wear"
              />
            </div>

            <div>
              <Label htmlFor="price_range">Price Range</Label>
              <Input
                id="price_range"
                value={formData.price_range}
                onChange={(e) => setFormData(prev => ({ ...prev, price_range: e.target.value }))}
                placeholder="e.g., ₦50,000 - ₦200,000"
              />
            </div>

            <div>
              <Label htmlFor="contact_whatsapp">WhatsApp Number</Label>
              <Input
                id="contact_whatsapp"
                value={formData.contact_whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_whatsapp: e.target.value }))}
                placeholder="e.g., +234 800 000 0000"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileEdit;
