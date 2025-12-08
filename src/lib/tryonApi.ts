import { supabase } from '@/integrations/supabase/client';
import type { CustomerMeasurements } from './measurements';

interface TryOnRequest {
    order_id: string;
    customer_photo_url: string;
    style_photo_url: string;
    measurements: CustomerMeasurements;
}

interface TryOnResponse {
    job_id: string;
    output_url?: string;
    error?: string;
}

/**
 * Generate AI try-on preview
 */
export async function generateTryOn(request: TryOnRequest): Promise<TryOnResponse> {
    try {
        const { data, error } = await supabase.functions.invoke('tryon-generate', {
            body: request,
        });

        if (error) {
            console.error('Try-on generation error:', error);
            return {
                job_id: '',
                error: error.message || 'Failed to generate try-on preview',
            };
        }

        return data as TryOnResponse;
    } catch (error) {
        console.error('Try-on API error:', error);
        return {
            job_id: '',
            error: 'Network error while generating try-on preview',
        };
    }
}

/**
 * Get try-on job status
 */
export async function getTryOnStatus(jobId: string): Promise<{
    status: string;
    output_url?: string;
    error_msg?: string;
}> {
    try {
        const { data, error } = await supabase
            .from('tryon_jobs')
            .select('status, output_url, error_msg')
            .eq('id', jobId)
            .single();

        if (error) {
            console.error('Error fetching try-on status:', error);
            return {
                status: 'failed',
                error_msg: error.message,
            };
        }

        return data;
    } catch (error) {
        console.error('Try-on status error:', error);
        return {
            status: 'failed',
            error_msg: 'Failed to check status',
        };
    }
}

/**
 * Poll try-on job until completion
 */
export async function waitForTryOnCompletion(
    jobId: string,
    options: {
        maxAttempts?: number;
        interval?: number;
        onProgress?: (attempt: number, status: string) => void;
    } = {}
): Promise<{
    success: boolean;
    output_url?: string;
    error?: string;
}> {
    const { maxAttempts = 30, interval = 2000, onProgress } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const status = await getTryOnStatus(jobId);

        if (onProgress) {
            onProgress(attempt, status.status);
        }

        if (status.status === 'done') {
            return {
                success: true,
                output_url: status.output_url,
            };
        }

        if (status.status === 'failed') {
            return {
                success: false,
                error: status.error_msg || 'Generation failed',
            };
        }

        // Wait before next poll
        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    return {
        success: false,
        error: 'Timeout waiting for try-on generation',
    };
}

/**
 * Generate try-on with fallback
 * Tries to generate and waits for completion
 */
export async function generateTryOnWithFallback(
    request: TryOnRequest,
    fallbackUrl: string,
    onProgress?: (status: string) => void
): Promise<{
    url: string;
    isFallback: boolean;
    error?: string;
}> {
    try {
        if (onProgress) onProgress('Initializing AI generation...');

        // Start generation
        const response = await generateTryOn(request);

        if (response.error || !response.job_id) {
            console.warn('Initial generation failed, using fallback');
            return {
                url: fallbackUrl,
                isFallback: true,
                error: response.error,
            };
        }

        if (onProgress) onProgress('Processing your photo...');

        // Wait for completion
        const result = await waitForTryOnCompletion(response.job_id, {
            onProgress: (attempt, status) => {
                if (onProgress) {
                    const messages = {
                        processing: 'Applying style to your photo...',
                        queued: 'In queue, please wait...',
                    };
                    onProgress(messages[status as keyof typeof messages] || `Processing (${attempt}/30)...`);
                }
            },
        });

        if (result.success && result.output_url) {
            if (onProgress) onProgress('Complete!');
            return {
                url: result.output_url,
                isFallback: false,
            };
        }

        // Fallback if generation failed
        console.warn('Generation completed but failed, using fallback');
        return {
            url: fallbackUrl,
            isFallback: true,
            error: result.error,
        };
    } catch (error) {
        console.error('Try-on generation error:', error);
        return {
            url: fallbackUrl,
            isFallback: true,
            error: 'Unexpected error during generation',
        };
    }
}
