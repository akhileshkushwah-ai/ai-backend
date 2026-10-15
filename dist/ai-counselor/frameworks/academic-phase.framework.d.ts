import { FullStudentReport } from '../data/dummy-student-report';
export type AcademicMilestoneId = 'ACADEMIC_1_INTRO_SEQUENCE' | 'ACADEMIC_2_READING_NEUROREAD' | 'ACADEMIC_3_CONCENTRATION_SYSTEM' | 'ACADEMIC_4_MEMORY_ACTIVE_RECALL' | 'ACADEMIC_5_GRASPING_SYSTEM' | 'ACADEMIC_6_IMPROVEMENT_ROADMAP' | 'ACADEMIC_7_TRANSITION_CHECK';
export interface AcademicMilestone {
    id: AcademicMilestoneId;
    milestoneNumber: number;
    name: string;
    part: 'Part A: Academic Foundation Analysis' | 'Part B: Academic Improvement Plan';
    targetDuration: string;
    focusSummary: string;
    counselorPromptDirective: string;
    reflectiveQuestion: string;
}
export declare const ACADEMIC_MILESTONES: AcademicMilestone[];
export declare function buildAcademicMasterProtocol(report: FullStudentReport, languagePreference?: string): string;
