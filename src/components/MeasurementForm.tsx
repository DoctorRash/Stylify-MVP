import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    measurementSchema,
    measurementFields,
    getSectionTitle,
    type MeasurementFormData,
    type CustomerMeasurements,
} from '@/lib/measurements';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Info, Ruler, Save } from 'lucide-react';
import { MeasurementGuide } from './MeasurementGuide';

interface MeasurementFormProps {
    initialData?: Partial<CustomerMeasurements>;
    onSubmit: (data: CustomerMeasurements) => void;
    onSaveDraft?: (data: Partial<CustomerMeasurements>) => void;
    isLoading?: boolean;
}

export function MeasurementForm({
    initialData,
    onSubmit,
    onSaveDraft,
    isLoading = false,
}: MeasurementFormProps) {
    const [showGuide, setShowGuide] = useState(false);

    const form = useForm<MeasurementFormData>({
        resolver: zodResolver(measurementSchema),
        defaultValues: {
            unit: 'inches',
            gender: initialData?.gender,
            notes: initialData?.notes || '',
            ...initialData,
        },
    });

    const gender = form.watch('gender');

    const handleSubmit = (data: MeasurementFormData) => {
        onSubmit(data as CustomerMeasurements);
    };

    const handleSaveDraft = () => {
        const currentValues = form.getValues();
        onSaveDraft?.(currentValues);
    };

    // Group fields by section
    const sections = {
        upper: measurementFields.filter((f) => f.section === 'upper'),
        arms: measurementFields.filter((f) => f.section === 'arms'),
        lower: measurementFields.filter((f) => f.section === 'lower'),
        lengths: measurementFields.filter((f) => f.section === 'lengths'),
    };

    return (
        <div className="space-y-6">
            {/* Header with Guide Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Body Measurements</h3>
                    <p className="text-sm text-muted-foreground">
                        All measurements must be in inches only
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGuide(true)}
                >
                    <Ruler className="mr-2 h-4 w-4" />
                    How to Measure
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Gender Selection */}
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Gender (Optional)</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender for specific measurements" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    Helps show relevant measurement fields
                                </FormDescription>
                            </FormItem>
                        )}
                    />

                    <Separator />

                    {/* Upper Body Section */}
                    <Card className="p-4 space-y-4">
                        <h4 className="font-medium text-base">
                            {getSectionTitle('upper')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sections.upper.map((field) => (
                                <FormField
                                    key={field.name}
                                    control={form.control}
                                    name={field.name}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-red-500">*</span>
                                                )}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p>{field.tooltip}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        min={field.min}
                                                        max={field.max}
                                                        placeholder={field.placeholder}
                                                        {...formField}
                                                        onChange={(e) =>
                                                            formField.onChange(parseFloat(e.target.value) || 0)
                                                        }
                                                        value={formField.value || ''}
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                                        in
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </Card>

                    {/* Arm Section */}
                    <Card className="p-4 space-y-4">
                        <h4 className="font-medium text-base">
                            {getSectionTitle('arms')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sections.arms.map((field) => (
                                <FormField
                                    key={field.name}
                                    control={form.control}
                                    name={field.name}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-red-500">*</span>
                                                )}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p>{field.tooltip}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        min={field.min}
                                                        max={field.max}
                                                        placeholder={field.placeholder}
                                                        {...formField}
                                                        onChange={(e) =>
                                                            formField.onChange(parseFloat(e.target.value) || 0)
                                                        }
                                                        value={formField.value || ''}
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                                        in
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </Card>

                    {/* Lower Body Section */}
                    <Card className="p-4 space-y-4">
                        <h4 className="font-medium text-base">
                            {getSectionTitle('lower')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sections.lower.map((field) => (
                                <FormField
                                    key={field.name}
                                    control={form.control}
                                    name={field.name}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-red-500">*</span>
                                                )}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p>{field.tooltip}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        min={field.min}
                                                        max={field.max}
                                                        placeholder={field.placeholder}
                                                        {...formField}
                                                        onChange={(e) =>
                                                            formField.onChange(parseFloat(e.target.value) || 0)
                                                        }
                                                        value={formField.value || ''}
                                                    />
                                                    <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                                        in
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </Card>

                    {/* Length Section */}
                    <Card className="p-4 space-y-4">
                        <h4 className="font-medium text-base">
                            {getSectionTitle('lengths')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sections.lengths.map((field) => {
                                // Skip gender-specific fields if not applicable
                                if (field.genderSpecific && gender !== field.genderSpecific) {
                                    return null;
                                }

                                return (
                                    <FormField
                                        key={field.name}
                                        control={form.control}
                                        name={field.name}
                                        render={({ field: formField }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2">
                                                    {field.label}
                                                    {field.required && (
                                                        <span className="text-red-500">*</span>
                                                    )}
                                                    {field.genderSpecific && (
                                                        <span className="text-xs text-muted-foreground">
                                                            (Female only)
                                                        </span>
                                                    )}
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-xs">
                                                                <p>{field.tooltip}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            min={field.min}
                                                            max={field.max}
                                                            placeholder={field.placeholder}
                                                            {...formField}
                                                            onChange={(e) =>
                                                                formField.onChange(parseFloat(e.target.value) || 0)
                                                            }
                                                            value={formField.value || ''}
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                                            in
                                                        </span>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </Card>

                    {/* Additional Notes */}
                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Additional Notes (Optional)</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Any special fitting requirements or preferences..."
                                        className="resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Maximum 500 characters
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        {onSaveDraft && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSaveDraft}
                                disabled={isLoading}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Save Draft
                            </Button>
                        )}
                        <Button type="submit" disabled={isLoading} className="flex-1">
                            {isLoading ? 'Saving...' : 'Continue'}
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Measurement Guide Dialog */}
            <MeasurementGuide open={showGuide} onOpenChange={setShowGuide} />
        </div>
    );
}
