import { z } from 'zod';

/**
 * Nigerian Tailor Measurements Interface
 * All measurements in INCHES only
 */
export interface CustomerMeasurements {
    // Upper Body
    shoulder_width: number;
    chest_bust: number;
    under_bust: number;
    waist: number;
    neck_circumference: number;

    // Arms
    arm_length: number;
    arm_width: number;

    // Lower Body
    hip: number;
    thigh: number;
    knee: number;
    inside_leg: number;

    // Lengths
    full_length_top: number;
    full_length_bottom: number;
    shoulder_to_nipple?: number; // Optional: for female wear
    shoulder_to_waist: number;
    waist_to_hip: number;

    // Metadata
    unit: 'inches';
    gender?: 'male' | 'female';
    notes?: string;
}

/**
 * Zod validation schema for measurements
 * Nigerian tailor standard measurements in inches
 */
export const measurementSchema = z.object({
    shoulder_width: z.number()
        .min(10, "Shoulder width must be at least 10 inches")
        .max(30, "Shoulder width cannot exceed 30 inches"),

    chest_bust: z.number()
        .min(24, "Chest/Bust must be at least 24 inches")
        .max(60, "Chest/Bust cannot exceed 60 inches"),

    under_bust: z.number()
        .min(20, "Under-bust must be at least 20 inches")
        .max(55, "Under-bust cannot exceed 55 inches"),

    waist: z.number()
        .min(20, "Waist must be at least 20 inches")
        .max(60, "Waist cannot exceed 60 inches"),

    hip: z.number()
        .min(24, "Hip must be at least 24 inches")
        .max(70, "Hip cannot exceed 70 inches"),

    arm_length: z.number()
        .min(18, "Arm length must be at least 18 inches")
        .max(36, "Arm length cannot exceed 36 inches"),

    arm_width: z.number()
        .min(8, "Arm width must be at least 8 inches")
        .max(24, "Arm width cannot exceed 24 inches"),

    thigh: z.number()
        .min(14, "Thigh must be at least 14 inches")
        .max(40, "Thigh cannot exceed 40 inches"),

    knee: z.number()
        .min(10, "Knee must be at least 10 inches")
        .max(30, "Knee cannot exceed 30 inches"),

    full_length_top: z.number()
        .min(20, "Full length (top) must be at least 20 inches")
        .max(60, "Full length (top) cannot exceed 60 inches"),

    full_length_bottom: z.number()
        .min(20, "Full length (bottom) must be at least 20 inches")
        .max(50, "Full length (bottom) cannot exceed 50 inches"),

    inside_leg: z.number()
        .min(20, "Inside leg must be at least 20 inches")
        .max(45, "Inside leg cannot exceed 45 inches"),

    shoulder_to_nipple: z.number()
        .min(5, "Shoulder to nipple must be at least 5 inches")
        .max(20, "Shoulder to nipple cannot exceed 20 inches")
        .optional(),

    shoulder_to_waist: z.number()
        .min(10, "Shoulder to waist must be at least 10 inches")
        .max(30, "Shoulder to waist cannot exceed 30 inches"),

    waist_to_hip: z.number()
        .min(5, "Waist to hip must be at least 5 inches")
        .max(20, "Waist to hip cannot exceed 20 inches"),

    neck_circumference: z.number()
        .min(10, "Neck circumference must be at least 10 inches")
        .max(24, "Neck circumference cannot exceed 24 inches"),

    unit: z.literal('inches'),
    gender: z.enum(['male', 'female']).optional(),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;

/**
 * Measurement field configuration
 */
export interface MeasurementField {
    name: keyof CustomerMeasurements;
    label: string;
    placeholder: string;
    tooltip: string;
    min: number;
    max: number;
    section: 'upper' | 'arms' | 'lower' | 'lengths';
    required: boolean;
    genderSpecific?: 'female';
}

export const measurementFields: MeasurementField[] = [
    // Upper Body
    {
        name: 'shoulder_width',
        label: 'Shoulder Width',
        placeholder: 'e.g., 16',
        tooltip: 'Measure across back from shoulder to shoulder',
        min: 10,
        max: 30,
        section: 'upper',
        required: true,
    },
    {
        name: 'chest_bust',
        label: 'Chest/Bust',
        placeholder: 'e.g., 36',
        tooltip: 'Measure around the fullest part of your chest/bust',
        min: 24,
        max: 60,
        section: 'upper',
        required: true,
    },
    {
        name: 'under_bust',
        label: 'Under-Bust',
        placeholder: 'e.g., 32',
        tooltip: 'Measure directly under the bust (for women)',
        min: 20,
        max: 55,
        section: 'upper',
        required: true,
    },
    {
        name: 'waist',
        label: 'Waist',
        placeholder: 'e.g., 30',
        tooltip: 'Measure around your natural waistline',
        min: 20,
        max: 60,
        section: 'upper',
        required: true,
    },
    {
        name: 'neck_circumference',
        label: 'Neck Circumference',
        placeholder: 'e.g., 15',
        tooltip: 'Measure around the base of your neck',
        min: 10,
        max: 24,
        section: 'upper',
        required: true,
    },

    // Arms
    {
        name: 'arm_length',
        label: 'Arm Length',
        placeholder: 'e.g., 24',
        tooltip: 'Measure from shoulder to wrist with arm slightly bent',
        min: 18,
        max: 36,
        section: 'arms',
        required: true,
    },
    {
        name: 'arm_width',
        label: 'Arm Width (Bicep)',
        placeholder: 'e.g., 12',
        tooltip: 'Measure around the fullest part of your bicep',
        min: 8,
        max: 24,
        section: 'arms',
        required: true,
    },

    // Lower Body
    {
        name: 'hip',
        label: 'Hip',
        placeholder: 'e.g., 38',
        tooltip: 'Measure around the fullest part of your hips',
        min: 24,
        max: 70,
        section: 'lower',
        required: true,
    },
    {
        name: 'thigh',
        label: 'Thigh',
        placeholder: 'e.g., 22',
        tooltip: 'Measure around the fullest part of your thigh',
        min: 14,
        max: 40,
        section: 'lower',
        required: true,
    },
    {
        name: 'knee',
        label: 'Knee',
        placeholder: 'e.g., 14',
        tooltip: 'Measure around your knee at the center',
        min: 10,
        max: 30,
        section: 'lower',
        required: true,
    },
    {
        name: 'inside_leg',
        label: 'Inside Leg',
        placeholder: 'e.g., 32',
        tooltip: 'Measure from crotch to ankle on the inside of leg',
        min: 20,
        max: 45,
        section: 'lower',
        required: true,
    },

    // Lengths
    {
        name: 'full_length_top',
        label: 'Full Length (Top)',
        placeholder: 'e.g., 28',
        tooltip: 'Measure from shoulder to desired hemline for tops',
        min: 20,
        max: 60,
        section: 'lengths',
        required: true,
    },
    {
        name: 'full_length_bottom',
        label: 'Full Length (Trouser/Skirt)',
        placeholder: 'e.g., 40',
        tooltip: 'Measure from waist to desired hemline for bottoms',
        min: 20,
        max: 50,
        section: 'lengths',
        required: true,
    },
    {
        name: 'shoulder_to_nipple',
        label: 'Shoulder to Nipple',
        placeholder: 'e.g., 10',
        tooltip: 'Measure from shoulder tip to nipple (for female wear)',
        min: 5,
        max: 20,
        section: 'lengths',
        required: false,
        genderSpecific: 'female',
    },
    {
        name: 'shoulder_to_waist',
        label: 'Shoulder to Waist',
        placeholder: 'e.g., 17',
        tooltip: 'Measure from shoulder to natural waist',
        min: 10,
        max: 30,
        section: 'lengths',
        required: true,
    },
    {
        name: 'waist_to_hip',
        label: 'Waist to Hip',
        placeholder: 'e.g., 9',
        tooltip: 'Measure from natural waist to hip line',
        min: 5,
        max: 20,
        section: 'lengths',
        required: true,
    },
];

/**
 * Format measurements for display
 */
export function formatMeasurements(measurements: CustomerMeasurements): string[] {
    return [
        `Shoulder: ${measurements.shoulder_width}"`,
        `Chest/Bust: ${measurements.chest_bust}"`,
        `Waist: ${measurements.waist}"`,
        `Hip: ${measurements.hip}"`,
        `Arm Length: ${measurements.arm_length}"`,
    ];
}

/**
 * Get section title
 */
export function getSectionTitle(section: MeasurementField['section']): string {
    const titles = {
        upper: 'Upper Body Measurements',
        arms: 'Arm Measurements',
        lower: 'Lower Body Measurements',
        lengths: 'Length Measurements',
    };
    return titles[section];
}

/**
 * Validate if measurements are complete
 */
export function areMeasurementsComplete(measurements: Partial<CustomerMeasurements>): boolean {
    const requiredFields = measurementFields
        .filter(f => f.required)
        .map(f => f.name);

    return requiredFields.every(field => {
        const value = measurements[field];
        return value !== undefined && value !== null && value > 0;
    });
}

/**
 * Measurement tips for users
 */
export const measurementTips = {
    general: [
        "Use a flexible measuring tape",
        "Wear fitted clothing or undergarments",
        "Stand straight with arms relaxed at sides",
        "Don't pull the tape too tight or too loose",
        "Measure twice to ensure accuracy",
    ],
    shoulder_width: "Measure across your back from shoulder bone to shoulder bone",
    chest_bust: "Measure at the fullest part, keeping tape parallel to the floor",
    waist: "Measure at your natural waistline, usually just above belly button",
    hip: "Measure at the fullest part of your hips and buttocks",
    arm_length: "Measure from shoulder point to wrist with arm slightly bent",
};
