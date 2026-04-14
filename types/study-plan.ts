export type StudyPlanRequest = {
  workflow2_result: string;
  study_days: number;
  daily_hours: number;
};

export type DailyPlanItem = {
  day: number;
  hours: number;
  tasks: string[];
};

export type StudyPlanResponse = {
  summary: string;
  scheduleAdvice: string;
  dailyPlans: DailyPlanItem[];
  suggestions: string[];
};
