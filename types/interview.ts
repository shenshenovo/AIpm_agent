export type PracticeMode = "standard" | "weakness";

export type QuestionType =
  | "self_intro"
  | "project"
  | "ai_product"
  | "requirement"
  | "behavior"
  | "random";

export type InterviewQuestion = {
  title: string;
  type: QuestionType | string;
  typeLabel: string;
  thinkTime: string;
  focusPoints: string[];
  questionPointsText: string;
};

export type ReviewContent = {
  strengths: string[];
  answerKeyPoints: string[];
  answerFramework: string[];
  misses: string[];
  suggestions: string[];
  sampleAnswer: string;
};

export type GenerateInterviewQuestionRequest = {
  practice_mode: PracticeMode;
  question_type: QuestionType;
  workflow1_result: string;
  workflow2_result: string;
  target_role_direction?: string;
  user_projects_result?: string;
  focus_on_weakness?: boolean;
  user_key?: string;
};

export type GenerateInterviewQuestionResponse = {
  question: InterviewQuestion;
  fallbackNotice?: string;
};

export type ReviewInterviewAnswerRequest = {
  current_question: string;
  currentquestionpoint: string;
  question_type: string;
  user_answer: string;
  target_role_direction?: string;
  workflow2_result: string;
};

export type ReviewInterviewAnswerResponse = {
  review: ReviewContent;
  fallbackNotice?: string;
};
