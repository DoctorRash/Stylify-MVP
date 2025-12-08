import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Loader2,
    Download,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    ImageIcon,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TryOnPreviewProps {
    customerPhoto: string;
    stylePhoto: string;
    onGenerate: () => Promise<{ url: string; isFallback: boolean; error?: string }>;
    onComplete?: (result: { url: string; isFallback: boolean }) => void;
    className?: string;
}

export function TryOnPreview({
    customerPhoto,
    stylePhoto,
    onGenerate,
    onComplete,
    className,
}: TryOnPreviewProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState<{
        url: string;
        isFallback: boolean;
        error?: string;
    } | null>(null);
    const [showComparison, setShowComparison] = useState<'before' | 'after' | 'split'>('split');

    const handleGenerate = async () => {
        setIsGenerating(true);
        setProgress(0);
        setResult(null);
        setStatus('Initializing AI generation...');

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    return prev + 10;
                });
            }, 1500);

            const generatedResult = await onGenerate();

            clearInterval(progressInterval);
            setProgress(100);
            setResult(generatedResult);
            setIsGenerating(false);
            setStatus('');

            if (onComplete) {
                onComplete({ url: generatedResult.url, isFallback: generatedResult.isFallback });
            }
        } catch (error) {
            console.error('Generation error:', error);
            setStatus('');
            setIsGenerating(false);
            setResult({
                url: stylePhoto,
                isFallback: true,
                error: error instanceof Error ? error.message : 'Generation failed',
            });
            setProgress(0);
        }
    };

    const handleDownload = () => {
        if (!result) return;

        const link = document.createElement('a');
        link.href = result.url;
        link.download = `try-on-${Date.now()}.webp`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusMessages = () => {
        const messages = [
            'Analyzing your photo...',
            'Detecting body structure...',
            'Applying clothing style...',
            'Adjusting fit based on measurements...',
            'Rendering realistic shadows...',
            'Finalizing your preview...',
        ];

        const index = Math.floor((progress / 100) * messages.length);
        return messages[Math.min(index, messages.length - 1)];
    };

    if (!result && !isGenerating) {
        return (
            <Card className={cn('p-8', className)}>
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="rounded-full bg-primary/10 p-6">
                        <Sparkles className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Ready to Generate AI Preview</h3>
                        <p className="text-muted-foreground mb-4">
                            Click below to see how this style will look on you using AI technology
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Your Photo</p>
                            <div className="aspect-[3/4] relative overflow-hidden rounded-lg border">
                                <img
                                    src={customerPhoto}
                                    alt="Your photo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Selected Style</p>
                            <div className="aspect-[3/4] relative overflow-hidden rounded-lg border">
                                <img
                                    src={stylePhoto}
                                    alt="Style"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleGenerate} size="lg" className="w-full max-w-md">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate AI Try-On
                    </Button>
                </div>
            </Card>
        );
    }

    if (isGenerating) {
        return (
            <Card className={cn('p-8', className)}>
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="relative">
                        <div className="rounded-full bg-primary/10 p-6">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        </div>
                    </div>
                    <div className="w-full max-w-md space-y-3">
                        <h3 className="text-xl font-semibold">Generating Your Try-On Preview</h3>
                        <Progress value={progress} className="h-2" />
                        <p className="text-sm text-muted-foreground">{getStatusMessages()}</p>
                        <p className="text-xs text-muted-foreground">
                            This usually takes 20-30 seconds
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    if (result) {
        return (
            <div className={cn('space-y-4', className)}>
                {result.isFallback && (
                    <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-900 dark:text-amber-100">
                            {result.error ||
                                'AI preview is currently unavailable. Showing the selected style instead.'}
                        </AlertDescription>
                    </Alert>
                )}

                {!result.isFallback && (
                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-900 dark:text-green-100">
                            AI try-on generated successfully!
                        </AlertDescription>
                    </Alert>
                )}

                <Card className="p-4">
                    {/* Comparison Toggle */}
                    <div className="flex justify-center gap-2 mb-4">
                        <Button
                            variant={showComparison === 'before' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowComparison('before')}
                        >
                            Your Photo
                        </Button>
                        <Button
                            variant={showComparison === 'split' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowComparison('split')}
                        >
                            Compare
                        </Button>
                        <Button
                            variant={showComparison === 'after' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowComparison('after')}
                        >
                            AI Preview
                        </Button>
                    </div>

                    {/* Image Display */}
                    <div className="relative aspect-[3/4] max-w-md mx-auto overflow-hidden rounded-lg bg-muted">
                        {showComparison === 'before' && (
                            <img
                                src={customerPhoto}
                                alt="Before"
                                className="w-full h-full object-cover"
                            />
                        )}
                        {showComparison === 'after' && (
                            <img
                                src={result.url}
                                alt="After AI try-on"
                                className="w-full h-full object-cover"
                            />
                        )}
                        {showComparison === 'split' && (
                            <div className="flex h-full">
                                <div className="w-1/2 overflow-hidden border-r-2 border-white">
                                    <img
                                        src={customerPhoto}
                                        alt="Before"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="w-1/2 overflow-hidden">
                                    <img
                                        src={result.url}
                                        alt="After"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {showComparison === 'split' && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                            Before ← | → After
                        </p>
                    )}
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleGenerate} className="flex-1">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate
                    </Button>
                    <Button variant="outline" onClick={handleDownload} className="flex-1">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
