# CLX Dashboard

A powerful banking analytics dashboard built with **Next.js 15**, **React 19**, and **Tailwind CSS v4**. This application provides deep insights into banking metrics, featuring AI-powered summaries and dynamic data visualization.

## features

-   **Interactive Dashboard**: Visualize key performance indicators for banking operations.
-   **Universal Charts**: Flexible charting component for various data types.
-   **AI Insights**: Automated insights generation powered by OpenAI.
-   **AI Summary**: High-level summaries of complex data sets.
-   **Settings Panel**: Configure dashboard parameters and data sources.
-   **Google Cloud BigQuery Integration**: Seamlessly fetch and analyze large datasets.

## getting started

### prerequisites

-   Node.js (v20 or higher recommended)
-   npm, yarn, pnpm, or bun

### installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/oyemello/clx-dashboard.git
    cd clx-dashboard
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    # or
    yarn install
    # or
    npm install --legacy-peer-deps
    ```

3.  Set up environment variables:
    Copy `.env.example` to `.env.local` and fill in your credentials.
    ```bash
    cp .env.example .env.local
    ```

    You will need a Google Cloud Service Account with BigQuery access.

4.  Run the development server:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

5.  Insert csv/excel data in postgresql table

-   create a table in pgadmin
-   add columns with the same datatypes present in excel sheet run below command in your terminal
-   psql -U postgres -d test
run the below command then
-   \copy public.banking(customer_id, customer_segment, total_accounts, checking_accounts, savings_accounts, credit_cards, loan_accounts,total_balance_usd, monthly_income_usd, monthly_expenses_usd, avg_monthly_card_spend_usd, avg_monthly_loan_payment_usd, digital_active,tenure_years, credit_score, risk_segment) FROM 'C:/Users/Manav/Downloads/customer_details.csv' WITH (FORMAT csv, HEADER, DELIMITER ',', QUOTE '"');

(change the location with the exact location the csv/excel file lies in your system)

## project structure

-   `app/`: Next.js app router pages and layouts.
-   `components/`: Reusable UI components.
    -   `bank-dashboard/`: Specific components for the banking dashboard feature.
-   `lib/`: Utility functions and library configurations (BigQuery, etc.).
-   `sample-data/`: Example data files for testing and development.
-   `public/`: Static assets.

## technologies

-   [Next.js](https://nextjs.org/)
-   [React](https://react.dev/)
-   [Tailwind CSS](https://tailwindcss.com/)
-   [Shadcn UI](https://ui.shadcn.com/)
-   [Recharts](https://recharts.org/)
-   [Google Cloud BigQuery](https://cloud.google.com/bigquery)
-   [OpenAI API](https://openai.com/)

## license

This project is private and proprietary.
