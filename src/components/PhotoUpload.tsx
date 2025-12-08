import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateImage, compressImage, checkImageQuality } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
    label: string;
    guidelines?: string[];
    onUpload: (file: File, compressedBlob: Blob) => Promise<void>;
    onRemove?: () => void;
    existingUrl?: string;
    maxSize?: number; // in MB
    className?: string;
}

export function PhotoUpload({
    label,
    guidelines,
    onUpload,
    onRemove,
    existingUrl,
    maxSize = 10,
    className,
}: PhotoUploadProps) {
    const [preview, setPreview] = useState<string | null>(existingUrl || null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;

            setError(null);
            setSuccess(false);

            // Validate file
            const validation = validateImage(file);
            if (!validation.valid) {
                setError(validation.error || 'Invalid file');
                return;
            }

            // Check quality
            const qualityCheck = await checkImageQuality(file);
            if (!qualityCheck.acceptable) {
                setError(qualityCheck.message || 'Image quality too low');
                return;
            }

            // Show preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                setFileName(file.name);
            };
            reader.readAsDataURL(file);

            // Start upload
            setIsUploading(true);
            setUploadProgress(20);

            try {
                // Compress image
                setUploadProgress(40);
                const compressed = await compressImage(file);

                // Upload
                setUploadProgress(60);
                await onUpload(file, compressed);

                setUploadProgress(100);
                setSuccess(true);
                setIsUploading(false);

                // Clear success message after 3s
                setTimeout(() => setSuccess(false), 3000);
            } catch (err) {
                console.error('Upload error:', err);
                setError(err instanceof Error ? err.message : 'Upload failed');
                setIsUploading(false);
                setUploadProgress(0);
            }
        },
        [onUpload]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
        },
        maxSize: maxSize * 1024 * 1024,
        multiple: false,
        disabled: isUploading,
    });

    const handleRemove = () => {
        setPreview(null);
        setFileName(null);
        setError(null);
        setSuccess(false);
        setUploadProgress(0);
        onRemove?.();
    };

    return (
        <div className={cn('space-y-4', className)}>
            <div>
                <h3 className="font-medium mb-2">{label}</h3>
                {guidelines && guidelines.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1 mb-3">
                        {guidelines.map((guideline, index) => (
                            <li key={index} className="flex gap-2">
                                <span>•</span>
                                <span>{guideline}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {!preview ? (
                <Card
                    {...getRootProps()}
                    className={cn(
                        'border-2 border-dashed cursor-pointer transition-colors',
                        isDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/25 hover:border-primary/50',
                        isUploading && 'pointer-events-none opacity-50'
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="rounded-full bg-primary/10 p-4">
                            <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium">
                                {isDragActive ? 'Drop your photo here' : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                JPEG, PNG or WebP (max {maxSize}MB)
                            </p>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className="p-4">
                    <div className="relative aspect-[3/4] max-w-sm mx-auto mb-4">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleRemove}
                            disabled={isUploading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {fileName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />
                            <span className="truncate">{fileName}</span>
                        </div>
                    )}
                </Card>
            )}

            {isUploading && (
                <div className="space-y-2">
                    <Progress value={uploadProgress} />
                    <p className="text-sm text-muted-foreground text-center">
                        Uploading... {uploadProgress}%
                    </p>
                </div>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900 dark:text-green-100">
                        Photo uploaded successfully!
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
