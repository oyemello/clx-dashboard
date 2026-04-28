const { executeMockQuery } = require('./lib/bigquery/mock-query-engine');

async function test() {
    const overviewSql = "SELECT * FROM (SELECT COUNT(*) as totalCustomers), (SELECT COUNT(*) as totalAccounts)";
    const result = executeMockQuery(overviewSql);
    console.log("Overview Test Result:", result);

    const trendSql = "SELECT FORMAT_DATE('%Y-%m-%d', DATE(`date`)) as date, SUM(`amount`) as value FROM `transactions` GROUP BY 1";
    const trendResult = executeMockQuery(trendSql);
    console.log("Trend Test Result length:", trendResult.length);
}

test();
