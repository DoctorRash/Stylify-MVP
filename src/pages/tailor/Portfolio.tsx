import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Trash2, Plus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Style = Tables<"styles">;

const Portfolio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tailorId, setTailorId] = useState<string | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newStyle, setNewStyle] = useState({
    title: "",
    description: "",
    image_url: ""
  });

  useEffect(() => {
    const init = async () => {
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
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (tailorData) {
        setTailorId(tailorData.id);
        loadStyles(tailorData.id);
      } else {
        setLoading(false);
      }
    };

    init();
  }, [navigate, toast]);

  const loadStyles = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('tailor_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStyles(data || []);
    } catch (error) {
      console.error('Error loading styles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tailor-portfolio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tailor-portfolio')
        .getPublicUrl(filePath);

      setNewStyle(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({
        title: "Image uploaded",
        description: "Your portfolio image has been uploaded."
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

  const handleAddStyle = async () => {
    if (!tailorId || !newStyle.image_url || !newStyle.title) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide a title and upload an image."
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('styles')
        .insert({
          tailor_id: tailorId,
          title: newStyle.title,
          description: newStyle.description,
          image_url: newStyle.image_url
        });

      if (error) throw error;

      toast({
        title: "Style added",
        description: "Your portfolio item has been added."
      });

      setNewStyle({ title: "", description: "", image_url: "" });
      setIsDialogOpen(false);
      loadStyles(tailorId);
    } catch (error) {
      console.error('Error adding style:', error);
      toast({
        variant: "destructive",
        title: "Failed to add style",
        description: "Please try again."
      });
    }
  };

  const handleDeleteStyle = async (styleId: string, imageUrl: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('styles')
        .delete()
        .eq('id', styleId);

      if (error) throw error;

      // Delete from storage
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('tailor-portfolio')
          .remove([fileName]);
      }

      toast({
        title: "Style deleted",
        description: "Portfolio item has been removed."
      });

      if (tailorId) loadStyles(tailorId);
    } catch (error) {
      console.error('Error deleting style:', error);
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: "Please try again."
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <h1 className="text-4xl font-bold text-primary mb-2">Portfolio Management</h1>
            <p className="text-muted-foreground">Showcase your best work</p>
          </div>
          <div className="flex gap-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Style
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Portfolio Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="style-image">Image *</Label>
                    <div className="mt-2 space-y-4">
                      {newStyle.image_url && (
                        <img 
                          src={newStyle.image_url} 
                          alt="Preview" 
                          className="w-full h-64 object-cover rounded-lg border-2 border-border"
                        />
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors w-full justify-center">
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
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={newStyle.title}
                      onChange={(e) => setNewStyle(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Elegant Wedding Gown"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newStyle.description}
                      onChange={(e) => setNewStyle(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this style..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleAddStyle} className="w-full" disabled={uploading}>
                    Add to Portfolio
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => navigate('/tailor/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Portfolio Grid */}
        {styles.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No portfolio items yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Style
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {styles.map((style) => (
              <motion.div key={style.id} variants={fadeInUp}>
                <Card className="overflow-hidden group">
                  <div className="relative">
                    <img
                      src={style.image_url}
                      alt={style.title || "Portfolio item"}
                      className="w-full h-64 object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteStyle(style.id, style.image_url)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
        )}
      </motion.div>
    </div>
  );
};

export default Portfolio;
