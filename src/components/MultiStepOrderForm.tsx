import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, ArrowRight, Loader2, Upload, X, Check, 
  User, Ruler, Palette, Eye, CheckCircle 
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { z } from "zod";

type Style = Tables<"styles">;
type Order = Tables<"orders">;

const STEPS = [
  { id: 1, title: "Contact", icon: User },
  { id: 2, title: "Measurements", icon: Ruler },
  { id: 3, title: "Style", icon: Palette },
  { id: 4, title: "Preview", icon: Eye },
  { id: 5, title: "Confirm", icon: CheckCircle },
];

const contactSchema = z.object({
  customer_name: z.string().trim().min(1, "Name is required").max(100),
  customer_phone: z.string().trim().min(10, "Valid phone required").max(20),
  customer_email: z.string().trim().email().optional().or(z.literal("")),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface MultiStepOrderFormProps {
  tailorId: string;
  tailorName: string;
  styles: Style[];
  onComplete: () => void;
  onCancel: () => void;
}

export const MultiStepOrderForm = ({
  tailorId,
  tailorName,
  styles,
  onComplete,
  onCancel,
}: MultiStepOrderFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [tryonResult, setTryonResult] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    measurements: {} as Record<string, string>,
    photo_urls: [] as string[],
    style_id: null as string | null,
    fabric_type: "",
    design_notes: "",
  });

  // Load user data if authenticated
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from("users")
          .select("name, email, phone")
          .eq("id", session.user.id)
          .single();

        if (userData) {
          setFormData((prev) => ({
            ...prev,
            customer_name: userData.name || "",
            customer_email: userData.email || "",
            customer_phone: userData.phone || "",
          }));
        }
      }
    };
    loadUserData();
  }, []);

  // Autosave order
  const autosave = useCallback(async () => {
    if (currentStep < 1) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const orderData = {
        tailor_id: tailorId,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email || null,
        customer_phone: formData.customer_phone,
        customer_user_id: session?.user.id || null,
        measurements: { 
          ...formData.measurements, 
          notes: formData.design_notes 
        },
        photo_urls: formData.photo_urls.length > 0 ? formData.photo_urls : null,
        style_id: formData.style_id,
        fabric_type: formData.fabric_type || null,
        status: "pending",
      };

      if (orderId) {
        await supabase.from("orders").update(orderData).eq("id", orderId);
      } else if (formData.customer_name && formData.customer_phone) {
        const { data, error } = await supabase
          .from("orders")
          .insert(orderData)
          .select("id")
          .single();

        if (error) throw error;
        if (data) setOrderId(data.id);
      }
    } catch (error) {
      console.error("Autosave error:", error);
    } finally {
      setSaving(false);
    }
  }, [tailorId, formData, orderId, currentStep]);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(autosave, 1500);
    return () => clearTimeout(timer);
  }, [formData, autosave]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(
      (file) => !ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
    );

    if (invalidFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid files",
        description: "Please upload JPEG, PNG, or WebP images under 5MB.",
      });
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("order-references")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("order-references")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setFormData((prev) => ({
        ...prev,
        photo_urls: [...prev.photo_urls, ...uploadedUrls],
      }));

      toast({ title: "Images uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index),
    }));
  };

  const triggerTryOn = async () => {
    if (!orderId || formData.photo_urls.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing data",
        description: "Please upload a photo first.",
      });
      return;
    }

    setTryonLoading(true);
    try {
      const selectedStyle = styles.find((s) => s.id === formData.style_id);
      
      const { data, error } = await supabase.functions.invoke("tryon-generate", {
        body: {
          order_id: orderId,
          customer_photo_url: formData.photo_urls[0],
          style_image_url: selectedStyle?.image_url,
        },
      });

      if (error) throw error;

      // Poll for result
      pollTryonStatus(data.job_id);
    } catch (error) {
      console.error("Try-on error:", error);
      toast({
        variant: "destructive",
        title: "Try-on failed",
        description: "Using fallback preview instead.",
      });
      setTryonLoading(false);
    }
  };

  const pollTryonStatus = async (jobId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      const { data: job, error } = await supabase
        .from("tryon_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (error || !job) {
        setTryonLoading(false);
        return;
      }

      if (job.status === "done" && job.output_url) {
        setTryonResult(job.output_url);
        setTryonLoading(false);
        return;
      }

      if (job.status === "failed") {
        toast({
          variant: "destructive",
          title: "Preview failed",
          description: job.error_msg || "Using original image.",
        });
        setTryonLoading(false);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setTryonLoading(false);
      }
    };

    poll();
  };

  const validateStep = () => {
    if (currentStep === 1) {
      try {
        contactSchema.parse(formData);
        return true;
      } catch (e) {
        if (e instanceof z.ZodError) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: e.issues[0].message,
          });
        }
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep() && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const finalizeOrder = async () => {
    if (!orderId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Order not saved. Please try again.",
      });
      return;
    }

    setSaving(true);
    try {
      await supabase
        .from("orders")
        .update({ status: "pending" })
        .eq("id", orderId);

      toast({
        title: "Order placed successfully!",
        description: "The tailor will contact you soon.",
      });
      onComplete();
    } catch (error) {
      console.error("Finalize error:", error);
      toast({
        variant: "destructive",
        title: "Failed to place order",
        description: "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Order from {tailorName}</h2>
          {saving && (
            <Badge variant="outline" className="text-muted-foreground">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Saving...
            </Badge>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center gap-1 ${
                step.id <= currentStep ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.id < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id === currentStep
                    ? "border-2 border-primary"
                    : "border-2 border-muted"
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: Contact */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customer_name: e.target.value }))
                    }
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.customer_phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customer_phone: e.target.value }))
                    }
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customer_email: e.target.value }))
                    }
                    placeholder="your.email@example.com"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Measurements/Photo Upload */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Measurements & Photo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {["Chest", "Waist", "Hips", "Shoulder", "Arm Length", "Leg Length"].map(
                    (measurement) => (
                      <div key={measurement}>
                        <Label htmlFor={measurement.toLowerCase()}>{measurement} (inches)</Label>
                        <Input
                          id={measurement.toLowerCase()}
                          type="number"
                          value={formData.measurements[measurement.toLowerCase()] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              measurements: {
                                ...prev.measurements,
                                [measurement.toLowerCase()]: e.target.value,
                              },
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                    )
                  )}
                </div>

                <div className="border-t pt-4">
                  <Label>Your Photo (for try-on preview)</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a full-body photo to see how the style will look on you
                  </p>

                  {formData.photo_urls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {formData.photo_urls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Photo ${index + 1}`}
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
                    <div className="flex items-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors justify-center border-2 border-dashed border-border">
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploading ? "Uploading..." : "Upload Photos"}
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Style & Fabric Selection */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Style</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {styles.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {styles.map((style) => (
                      <div
                        key={style.id}
                        className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          formData.style_id === style.id
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, style_id: style.id }))
                        }
                      >
                        <img
                          src={style.image_url}
                          alt={style.title || "Style"}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-2">
                          <p className="text-sm font-medium truncate">
                            {style.title || "Untitled"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No styles available. Describe your desired style below.
                  </p>
                )}

                <div>
                  <Label htmlFor="fabric">Preferred Fabric</Label>
                  <Input
                    id="fabric"
                    value={formData.fabric_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fabric_type: e.target.value }))
                    }
                    placeholder="e.g., Cotton, Silk, Ankara, Lace"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Design Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.design_notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, design_notes: e.target.value }))
                    }
                    placeholder="Describe any specific details or modifications..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Preview */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview Your Look</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Before */}
                  <div className="space-y-2">
                    <Label>Your Photo</Label>
                    {formData.photo_urls[0] ? (
                      <img
                        src={formData.photo_urls[0]}
                        alt="Your photo"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No photo uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* After / Try-on */}
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    {tryonLoading ? (
                      <div className="w-full h-64 bg-muted rounded-lg flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                        <p className="text-muted-foreground">Generating preview...</p>
                      </div>
                    ) : tryonResult ? (
                      <img
                        src={tryonResult}
                        alt="Try-on preview"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-64 bg-muted rounded-lg flex flex-col items-center justify-center">
                        {formData.style_id ? (
                          <img
                            src={styles.find((s) => s.id === formData.style_id)?.image_url}
                            alt="Selected style"
                            className="w-full h-64 object-cover rounded-lg"
                          />
                        ) : (
                          <p className="text-muted-foreground">Select a style first</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {formData.photo_urls[0] && formData.style_id && !tryonResult && (
                  <Button
                    onClick={triggerTryOn}
                    disabled={tryonLoading}
                    className="w-full"
                    variant="secondary"
                  >
                    {tryonLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Try-On Preview"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Confirm */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>Confirm Your Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{formData.customer_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{formData.customer_phone}</span>
                  </div>
                  {formData.customer_email && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{formData.customer_email}</span>
                    </div>
                  )}
                  {formData.fabric_type && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Fabric</span>
                      <span className="font-medium">{formData.fabric_type}</span>
                    </div>
                  )}
                  {formData.style_id && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Selected Style</span>
                      <span className="font-medium">
                        {styles.find((s) => s.id === formData.style_id)?.title || "Custom"}
                      </span>
                    </div>
                  )}
                  {Object.keys(formData.measurements).length > 0 && (
                    <div className="py-2 border-b">
                      <span className="text-muted-foreground block mb-2">Measurements</span>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(formData.measurements)
                          .filter(([_, v]) => v)
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key}:</span>
                              <span>{value}"</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {formData.design_notes && (
                    <div className="py-2">
                      <span className="text-muted-foreground block mb-2">Notes</span>
                      <p className="text-sm">{formData.design_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : prevStep}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>

        {currentStep < 5 ? (
          <Button onClick={nextStep}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={finalizeOrder} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Place Order
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
