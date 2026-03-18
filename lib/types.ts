export type SurveySettings = {
  id: number;
  surveyTitle: string;
  questionTitle: string;
  minSelect: number;
  maxSelect: number;
  isOpen: boolean;
  updatedAt: string;
};

export type HairOption = {
  id: number;
  name: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
};

export type ResponseRow = {
  id: number;
  participantId: string;
  participantName: string;
  selectedOptionIds: number[];
  submittedAt: string;
};

export type OptionStat = {
  optionId: number;
  optionName: string;
  imageUrl: string;
  votes: number;
  ratio: number;
};

export type AdminDashboardData = {
  settings: SurveySettings;
  options: HairOption[];
  responses: ResponseRow[];
  stats: {
    totalParticipants: number;
    totalResponses: number;
    averageSelections: number;
    mostVotedOptionName: string | null;
  };
  optionStats: OptionStat[];
};

export type PublicSurveyData = {
  settings: SurveySettings;
  options: HairOption[];
};
