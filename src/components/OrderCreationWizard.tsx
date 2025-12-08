import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { MeasurementForm } from './MeasurementForm';
import { PhotoUpload } from './PhotoUpload';
import { TryOnPreview } from './TryOnPreview';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadCustomerPhoto, uploadStylePhoto } from '@/lib/imageUpload';
import { generateTryOnWithFallback } from '@/lib/tryonApi';
import type { CustomerMeasurements } from '@/lib/measurements';
import type { Tables } from '@/integrations/supabase/types';

interface OrderCreationWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tailorId: string;
    tailorName: string;
    styles?: Tables<'styles'>[];
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface WizardState {
    selectedStyleId?: string;
    customStyleFile?: File;
    stylePhotoUrl?: string;
    customerPhotoFile?: File;
    customerPhotoUrl?: string;
    measurements?: CustomerMeasurements;
    tryOnResultUrl?: string;
    tryOnIsFallback?: boolean;
    customerEmail?: string;
    customerPhone?: string;
    additionalNotes?: string;
}

export function OrderCreationWizard({
    open,
    onOpenChange,
    tailorId,
    tailorName,
    styles = [],
}: OrderCreationWizardProps) {
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [state, setState] = useState<WizardState>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const totalSteps = 6;
    const progressPercentage = (currentStep / totalSteps) * 100;

    // Check if user is authenticated
    const [userId, setUserId] = useState<string | null>(null);

    useState(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id || null);
        });
    });

    const stepTitles: Record<Step, string> = {
        1: 'Select Style',
        2: 'Upload Your Photo',
        3: 'Enter Measurements',
        4: 'Review & Generate Preview',
        5: 'AI Try-On Result',
        6: 'Complete Order',
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return !!(state.selectedStyleId || state.customStyleFile || state.stylePhotoUrl);
            case 2:
                // Made optional - allow skip even if upload fails
                return true;
            case 3:
                return !!state.measurements;
            case 4:
                return true; // Can proceed to generate
            case 5:
                // Made optional - allow skip even if AI generation fails
                return true;
            case 6:
                return !!(state.customerEmail && state.customerPhone);
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep((prev) => (prev + 1) as Step);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => (prev - 1) as Step);
        }
    };

    const handleStyleSelect = (styleId: string, styleUrl: string) => {
        setState((prev) => ({
            ...prev,
            selectedStyleId: styleId,
            stylePhotoUrl: styleUrl,
            customStyleFile: undefined,
        }));
    };

    const handleCustomStyleUpload = async (file: File, blob: Blob) => {
        if (!userId) {
            toast({
                title: 'Error',
                description: 'You must be logged in to upload photos',
                variant: 'destructive',
            });
            return;
        }

        const result = await uploadStylePhoto(file, userId);
        if (result.error) {
            toast({
                title: 'Upload Failed',
                description: result.error,
                variant: 'destructive',
            });
            return;
        }

        setState((prev) => ({
            ...prev,
            customStyleFile: file,
            stylePhotoUrl: result.url,
            selectedStyleId: undefined,
        }));

        toast({
            title: 'Style Uploaded',
            description: 'Your style photo has been uploaded successfully',
        });
    };

    const handleCustomerPhotoUpload = async (file: File, blob: Blob) => {
        if (!userId) {
            toast({
                title: 'Error',
                description: 'You must be logged in to upload photos',
                variant: 'destructive',
            });
            return;
        }

        const result = await uploadCustomerPhoto(file, userId);
        if (result.error) {
            toast({
                title: 'Upload Failed',
                description: result.error,
                variant: 'destructive',
            });
            return;
        }

        setState((prev) => ({
            ...prev,
            customerPhotoFile: file,
            customerPhotoUrl: result.url,
        }));

        toast({
            title: 'Photo Uploaded',
            description: 'Your photo has been uploaded successfully',
        });
    };

    const handleMeasurementSubmit = (measurements: CustomerMeasurements) => {
        setState((prev) => ({ ...prev, measurements }));
        handleNext();
    };

    const handleGenerateTryOn = async () => {
        if (!state.customerPhotoUrl || !state.stylePhotoUrl || !userId) {
            toast({
                title: 'Error',
                description: 'Missing required data for try-on generation',
                variant: 'destructive',
            });
            return { url: state.stylePhotoUrl || '', isFallback: true };
        }

        // Create a temporary order to get order_id
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                tailor_id: tailorId,
                customer_user_id: userId,
                customer_name: 'Temporary',
                customer_phone: 'Temporary',
                customer_photo_url: state.customerPhotoUrl,
                style_photo_url: state.stylePhotoUrl,
                measurements: state.measurements,
                status: 'draft',
            })
            .select('id')
            .single();

        if (orderError || !order) {
            console.error('Error creating temp order:', orderError);
            return { url: state.stylePhotoUrl, isFallback: true };
        }

        const result = await generateTryOnWithFallback(
            {
                order_id: order.id,
                customer_photo_url: state.customerPhotoUrl,
                style_photo_url: state.stylePhotoUrl,
                measurements: state.measurements!,
            },
            state.stylePhotoUrl,
            (status) => {
                console.log('Try-on status:', status);
            }
        );

        setState((prev) => ({
            ...prev,
            tryOnResultUrl: result.url,
            tryOnIsFallback: result.isFallback,
        }));

        return result;
    };

    const handleFinalSubmit = async () => {
        if (!userId || !state.customerEmail || !state.customerPhone) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    tailor_id: tailorId,
                    customer_user_id: userId,
                    customer_name: state.customerEmail.split('@')[0],
                    customer_phone: state.customerPhone,
                    customer_email: state.customerEmail,
                    customer_photo_url: state.customerPhotoUrl || null,
                    style_photo_url: state.stylePhotoUrl || null,
                    style_id: state.selectedStyleId || null,
                    measurements: state.measurements || null,
                    measurements_complete: !!state.measurements,
                    status: 'pending',
                    design_image_url: state.tryOnResultUrl || null,
                })
                .select('id')
                .single();

            if (error) throw error;

            // Send notification to tailor
            await supabase.functions.invoke('send-notification', {
                body: {
                    type: 'order_created',
                    recipient_email: '', // Will be fetched in edge function
                    order_id: order.id,
                    customer_name: state.customerEmail.split('@')[0],
                    tailor_name: tailorName,
                },
            });

            toast({
                title: 'Order Created!',
                description: 'Your order has been sent to the tailor',
            });

            onOpenChange(false);
            navigate('/customer/orders');
        } catch (error) {
            console.error('Order creation error:', error);
            toast({
                title: 'Error',
                description: 'Failed to create order. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Choose Your Style</h3>
                            {styles.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                    {styles.map((style) => (
                                        <Card
                                            key={style.id}
                                            className={`cursor-pointer transition-all ${state.selectedStyleId === style.id
                                                ? 'ring-2 ring-primary'
                                                : 'hover:ring-1 hover:ring-primary/50'
                                                }`}
                                            onClick={() => handleStyleSelect(style.id, style.image_url)}
                                        >
                                            <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
                                                <img
                                                    src={style.image_url}
                                                    alt={style.title || 'Style'}
                                                    className="w-full h-full object-cover"
                                                />
                                                {state.selectedStyleId === style.id && (
                                                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                                                        <Check className="h-4 w-4 text-primary-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                            {style.title && (
                                                <div className="p-2">
                                                    <p className="text-sm font-medium truncate">{style.title}</p>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground mb-4">
                                    No styles available from this tailor
                                </p>
                            )}

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">Or Upload Your Own Style</h4>
                                <PhotoUpload
                                    label="Custom Style Photo"
                                    guidelines={[
                                        'Clear view of the garment',
                                        'Good lighting showing details',
                                        'Shows full design',
                                    ]}
                                    onUpload={handleCustomStyleUpload}
                                    existingUrl={state.customStyleFile ? URL.createObjectURL(state.customStyleFile) : undefined}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Upload Your Photo</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                For best results, upload a full-body photo taken from the front
                            </p>
                        </div>
                        <PhotoUpload
                            label="Your Full-Body Photo"
                            guidelines={[
                                'Stand straight, front-facing',
                                'Full body visible (head to toe)',
                                'Wear fitted clothing',
                                'Good lighting, plain background',
                            ]}
                            onUpload={handleCustomerPhotoUpload}
                            existingUrl={state.customerPhotoFile ? URL.createObjectURL(state.customerPhotoFile) : undefined}
                        />
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Enter Your Measurements</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                All measurements must be in inches. Use the guide for accurate measurements.
                            </p>
                        </div>
                        <MeasurementForm
                            initialData={state.measurements}
                            onSubmit={handleMeasurementSubmit}
                            onSaveDraft={(data) => setState((prev) => ({ ...prev, measurements: data as CustomerMeasurements }))}
                        />
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Check everything before generating your AI try-on preview
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card className="p-4">
                                <h4 className="font-medium mb-2">Your Photo</h4>
                                {state.customerPhotoUrl && (
                                    <img
                                        src={state.customerPhotoUrl}
                                        alt="Your photo"
                                        className="w-full aspect-[3/4] object-cover rounded-lg"
                                    />
                                )}
                            </Card>

                            <Card className="p-4">
                                <h4 className="font-medium mb-2">Selected Style</h4>
                                {state.stylePhotoUrl && (
                                    <img
                                        src={state.stylePhotoUrl}
                                        alt="Style"
                                        className="w-full aspect-[3/4] object-cover rounded-lg"
                                    />
                                )}
                            </Card>
                        </div>

                        {state.measurements && (
                            <Card className="p-4">
                                <h4 className="font-medium mb-2">Measurements Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div><span className="text-muted-foreground">Shoulder:</span> {state.measurements.shoulder_width}"</div>
                                    <div><span className="text-muted-foreground">Chest:</span> {state.measurements.chest_bust}"</div>
                                    <div><span className="text-muted-foreground">Waist:</span> {state.measurements.waist}"</div>
                                    <div><span className="text-muted-foreground">Hip:</span> {state.measurements.hip}"</div>
                                </div>
                            </Card>
                            <p className="text-sm text-muted-foreground mb-4">
                                Provide your contact information to finalize the order
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={state.customerEmail || ''}
                                    onChange={(e) =>
                                        setState((prev) => ({ ...prev, customerEmail: e.target.value }))
                                    }
                                />
                            </div>

                            <div>
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+234 xxx xxx xxxx"
                                    value={state.customerPhone || ''}
                                    onChange={(e) =>
                                        setState((prev) => ({ ...prev, customerPhone: e.target.value }))
                                    }
                                />
                            </div>

                            <div>
                                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Any special requests or preferences..."
                                    value={state.additionalNotes || ''}
                                    onChange={(e) =>
                                        setState((prev) => ({ ...prev, additionalNotes: e.target.value }))
                                    }
                                    className="resize-none"
                                    rows={4}
                                />
                            </div>

                            {state.tryOnResultUrl && !state.tryOnIsFallback && (
                                <Card className="p-4">
                                    <h4 className="font-medium mb-2">Your AI Try-On Preview</h4>
                                    <img
                                        src={state.tryOnResultUrl}
                                        alt="Try-on preview"
                                        className="w-full max-w-sm mx-auto rounded-lg"
                                    />
                                </Card>
                            )}
                        </div>
                    </div >
                );

            default:
    return null;
}
    };

return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Get Virtual Try-On from {tailorName}</DialogTitle>
                <DialogDescription>
                    Step {currentStep} of {totalSteps}: {stepTitles[currentStep]}
                </DialogDescription>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="space-y-2">
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    {Object.entries(stepTitles).map(([step, title]) => (
                        <span
                            key={step}
                            className={currentStep >= Number(step) ? 'text-primary font-medium' : ''}
                        >
                            {title}
                        </span>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="py-6">{renderStep()}</div>

            {/* Navigation Buttons */}
            <div className="flex justify-between border-t pt-4">
                <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1 || isSubmitting}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                {currentStep < totalSteps ? (
                    <Button onClick={handleNext} disabled={!canProceed() || isSubmitting}>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleFinalSubmit} disabled={!canProceed() || isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Order'}
                        <Check className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </DialogContent>
    </Dialog>
);
}
