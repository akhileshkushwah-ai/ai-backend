export interface ReportDataItem {
    name: string;
    section: string;
    score: number;
    category?: string;
}
export interface TestReportItem {
    name: string;
    score: number;
    wordsLength?: number;
    timeTaken?: number;
}
export interface AIUsageGuidelines {
    useReportAsPrimaryStudentContext: boolean;
    personalizeAnswersUsingScores: boolean;
    useConversationHistoryForFollowUps: boolean;
    doNotAskStudentToRepeatReportData: boolean;
    doNotTreatScoresAsAbsoluteCareerDecisions: boolean;
    explainRecommendationsUsingRelevantReportFactors: boolean;
}
export interface StudentAssessmentContext {
    purpose: string;
    reportData: ReportDataItem[];
    testReport: TestReportItem[];
    aiUsageGuidelines: AIUsageGuidelines;
}
export interface FullStudentReport {
    studentId: string;
    studentName: string;
    grade?: string;
    stream?: string;
    assessmentDate?: string;
    studentAssessmentContext: StudentAssessmentContext;
}
export declare const DUMMY_STUDENT_REPORT: FullStudentReport;
