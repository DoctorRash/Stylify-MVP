import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { measurementTips } from '@/lib/measurements';

interface MeasurementGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MeasurementGuide({ open, onOpenChange }: MeasurementGuideProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>How to Take Accurate Measurements</DialogTitle>
                    <DialogDescription>
                        Follow these guidelines to ensure your custom garment fits perfectly
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basics" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basics">Basics</TabsTrigger>
                        <TabsTrigger value="tips">Tips</TabsTrigger>
                        <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
                    </TabsList>

                    <TabsContent value="basics" className="space-y-4 mt-4">
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                General Guidelines
                            </h3>
                            <ul className="space-y-2 text-sm">
                                {measurementTips.general.map((tip, index) => (
                                    <li key={index} className="flex gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>

                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">What You'll Need</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>A flexible measuring tape (cloth/plastic, not metal)</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>Fitted clothing or underwear</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>A mirror to check tape position</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <span>Someone to help (recommended for best accuracy)</span>
                                </li>
                            </ul>
                        </Card>
                    </TabsContent>

                    <TabsContent value="tips" className="space-y-4 mt-4">
                        <Card className="p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                            <h3 className="font-semibold mb-2 flex items-center gap-2 text-amber-900 dark:text-amber-100">
                                <AlertCircle className="h-5 w-5" />
                                Important Tips
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium">Shoulder Width:</span>
                                    <p className="text-muted-foreground mt-1">
                                        {measurementTips.shoulder_width}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium">Chest/Bust:</span>
                                    <p className="text-muted-foreground mt-1">
                                        {measurementTips.chest_bust}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium">Waist:</span>
                                    <p className="text-muted-foreground mt-1">
                                        {measurementTips.waist}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium">Hip:</span>
                                    <p className="text-muted-foreground mt-1">
                                        {measurementTips.hip}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium">Arm Length:</span>
                                    <p className="text-muted-foreground mt-1">
                                        {measurementTips.arm_length}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">Common Mistakes to Avoid</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-2">
                                    <span className="text-red-500">✗</span>
                                    <span>Pulling the tape too tight - allow some breathing room</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-red-500">✗</span>
                                    <span>Measuring over bulky clothing</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-red-500">✗</span>
                                    <span>Not keeping the tape level and parallel to the floor</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-red-500">✗</span>
                                    <span>Slouching or tensing up while measuring</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-red-500">✗</span>
                                    <span>Measuring different sides (always use same side consistently)</span>
                                </li>
                            </ul>
                        </Card>
                    </TabsContent>

                    <TabsContent value="diagrams" className="space-y-4 mt-4">
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">Measurement Points</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-2">
                                    <h4 className="font-medium text-primary">Upper Body</h4>
                                    <ul className="space-y-1 text-muted-foreground">
                                        <li><span className="text-foreground">1.</span> Shoulder width - across back</li>
                                        <li><span className="text-foreground">2.</span> Chest/Bust - fullest part</li>
                                        <li><span className="text-foreground">3.</span> Under-bust - below breasts</li>
                                        <li><span className="text-foreground">4.</span> Waist - natural waistline</li>
                                        <li><span className="text-foreground">5.</span> Neck - base of neck</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-medium text-primary">Arms</h4>
                                    <ul className="space-y-1 text-muted-foreground">
                                        <li><span className="text-foreground">6.</span> Arm length - shoulder to wrist</li>
                                        <li><span className="text-foreground">7.</span> Arm width - around bicep</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-medium text-primary">Lower Body</h4>
                                    <ul className="space-y-1 text-muted-foreground">
                                        <li><span className="text-foreground">8.</span> Hip - fullest part</li>
                                        <li><span className="text-foreground">9.</span> Thigh - fullest part</li>
                                        <li><span className="text-foreground">10.</span> Knee - around knee center</li>
                                        <li><span className="text-foreground">11.</span> Inside leg - crotch to ankle</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-medium text-primary">Lengths</h4>
                                    <ul className="space-y-1 text-muted-foreground">
                                        <li><span className="text-foreground">12.</span> Full length (top)</li>
                                        <li><span className="text-foreground">13.</span> Full length (bottom)</li>
                                        <li><span className="text-foreground">14.</span> Shoulder to nipple (F)</li>
                                        <li><span className="text-foreground">15.</span> Shoulder to waist</li>
                                        <li><span className="text-foreground">16.</span> Waist to hip</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                                <strong>Pro Tip:</strong> For the most accurate measurements, have someone else measure you.
                                Stand naturally, breathe normally, and don't suck in your stomach. The goal is a comfortable,
                                well-fitting garment - not a too-tight one!
                            </p>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
