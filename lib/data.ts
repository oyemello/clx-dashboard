import data from '@/data/amex_intelligence_dataset_1000_customers.json';

export type Customer = {
    customerId: string;
    segment: "Retail" | "SMB" | "Affluent";
    riskTier: "low" | "medium" | "high";
    lifecycleState: "dormant" | "active" | "at_risk";
    behavior: {
        payInFullRate: number;
        utilizationRate: number;
        paymentPunctuality: number;
        spendVelocityChange: number;
        financialStressScore: number;
    };
    featureAdoption: {
        pay_over_time: boolean;
        offers: boolean;
        virtual_cards: boolean;
        apple_pay: boolean;
        google_pay: boolean;
        travel_portal: boolean;
    };
    cashflow: {
        monthly: Record<string, {
            inflow: number;
            outflow: number;
            net: number;
        }>;
    };
    revenue: {
        interchange: number;
        interest: number;
        fees: number;
        rewardsCost: number;
        netContribution: number;
    };
    risk: {
        creditRiskScore: number;
        fraudRiskScore: number;
        fraudLoss: number;
        fraudPrevented: number;
    };
};

export type InstitutionData = {
    schemaVersion: string;
    generatedAt: string;
    institution: {
        name: string;
        currency: string;
        regions: string[];
    };
    customers: Customer[];
};

export const getBankData = (): InstitutionData => {
    return data as InstitutionData;
};
