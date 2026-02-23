export type UserRead = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: UserRead;
};

export type MonthlyTrendPoint = {
  month: string;
  revenue: number;
  expense: number;
  net_cash_flow: number;
};

export type SummaryResponse = {
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  margin_percent: number;
  monthly_trend: MonthlyTrendPoint[];
  insights: string[];
};

export type HealthScoreResponse = {
  health_score: number;
  profit_margin_component: number;
  cash_flow_stability_component: number;
  expense_efficiency_component: number;
  interpretation: string;
};

export type RecurringExpenseItem = {
  category: string;
  average_monthly_amount: number;
  active_months: number;
};

export type ExpenseIntelligenceResponse = {
  recurring_expenses: RecurringExpenseItem[];
  recommendations: string[];
};

export type PredictionPoint = {
  month: string;
  predicted_cash_flow: number;
};

export type PredictionResponse = {
  model_used: string;
  horizon_months: number;
  deficit_risk_months: number;
  points: PredictionPoint[];
};

export type TransactionRead = {
  id: number;
  user_id: number;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  note?: string | null;
};
