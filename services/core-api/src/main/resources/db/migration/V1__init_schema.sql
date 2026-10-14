-- Foliolive PostgreSQL Initial Schema & Seed Data

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Instruments table
CREATE TABLE IF NOT EXISTS instruments (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    asset_class VARCHAR(50) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    cash_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    created_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Positions table
CREATE TABLE IF NOT EXISTS positions (
    id VARCHAR(64) PRIMARY KEY,
    portfolio_id VARCHAR(64) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    instrument_symbol VARCHAR(20) NOT NULL REFERENCES instruments(symbol),
    quantity NUMERIC(18, 4) NOT NULL,
    average_cost NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Trades table
CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(64) PRIMARY KEY,
    portfolio_id VARCHAR(64) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    instrument_symbol VARCHAR(20) NOT NULL REFERENCES instruments(symbol),
    side VARCHAR(10) NOT NULL,
    quantity NUMERIC(18, 4) NOT NULL,
    price NUMERIC(18, 4) NOT NULL,
    total_amount NUMERIC(18, 4) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Risk Limits table
CREATE TABLE IF NOT EXISTS risk_limits (
    id VARCHAR(64) PRIMARY KEY,
    portfolio_id VARCHAR(64) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    threshold NUMERIC(18, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    portfolio_id VARCHAR(64) NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    risk_limit_id VARCHAR(64) REFERENCES risk_limits(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    current_value NUMERIC(18, 4) NOT NULL,
    threshold_value NUMERIC(18, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_positions_portfolio ON positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_instrument ON positions(instrument_symbol);
CREATE INDEX IF NOT EXISTS idx_trades_portfolio ON trades(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed ON trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_risk_limits_portfolio ON risk_limits(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_alerts_portfolio ON alerts(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);

-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Seed Users: PM (read/write) and VIEWER (read-only)
-- Password for both: Password123!
INSERT INTO users (id, username, email, password_hash, full_name, role)
VALUES
    ('usr_pm_01', 'pm_demo', 'pm_demo@foliolive.internal', '$2a$10$Z0GFWeG2Ohom8xu5I/2/eelpxUMB8gfIGVn1ADkj52hKK.53GjgU6', 'Lead Portfolio Manager', 'ROLE_PM'),
    ('usr_viewer_01', 'viewer_demo', 'viewer_demo@foliolive.internal', '$2a$10$Z0GFWeG2Ohom8xu5I/2/eelpxUMB8gfIGVn1ADkj52hKK.53GjgU6', 'Risk Viewer Analyst', 'ROLE_VIEWER');

-- Seed 25 Instruments across 3 Asset Classes and 5 Sectors
INSERT INTO instruments (symbol, name, asset_class, sector, currency)
VALUES
    -- Equities - Technology
    ('AAPL', 'Apple Inc.', 'EQUITY', 'TECHNOLOGY', 'USD'),
    ('MSFT', 'Microsoft Corporation', 'EQUITY', 'TECHNOLOGY', 'USD'),
    ('NVDA', 'NVIDIA Corporation', 'EQUITY', 'TECHNOLOGY', 'USD'),
    ('GOOGL', 'Alphabet Inc. Class A', 'EQUITY', 'TECHNOLOGY', 'USD'),
    ('META', 'Meta Platforms Inc.', 'EQUITY', 'TECHNOLOGY', 'USD'),
    -- Equities - Financials
    ('JPM', 'JPMorgan Chase & Co.', 'EQUITY', 'FINANCIALS', 'USD'),
    ('GS', 'Goldman Sachs Group Inc.', 'EQUITY', 'FINANCIALS', 'USD'),
    ('MS', 'Morgan Stanley', 'EQUITY', 'FINANCIALS', 'USD'),
    ('BAC', 'Bank of America Corp.', 'EQUITY', 'FINANCIALS', 'USD'),
    -- Equities - Healthcare
    ('JNJ', 'Johnson & Johnson', 'EQUITY', 'HEALTHCARE', 'USD'),
    ('PFE', 'Pfizer Inc.', 'EQUITY', 'HEALTHCARE', 'USD'),
    ('UNH', 'UnitedHealth Group Inc.', 'EQUITY', 'HEALTHCARE', 'USD'),
    ('LLY', 'Eli Lilly and Company', 'EQUITY', 'HEALTHCARE', 'USD'),
    -- Equities - Consumer Discretionary
    ('AMZN', 'Amazon.com Inc.', 'EQUITY', 'CONSUMER_DISCRETIONARY', 'USD'),
    ('TSLA', 'Tesla Inc.', 'EQUITY', 'CONSUMER_DISCRETIONARY', 'USD'),
    ('HD', 'The Home Depot Inc.', 'EQUITY', 'CONSUMER_DISCRETIONARY', 'USD'),
    ('NKE', 'NIKE Inc.', 'EQUITY', 'CONSUMER_DISCRETIONARY', 'USD'),
    -- Equities - Energy
    ('XOM', 'Exxon Mobil Corp.', 'EQUITY', 'ENERGY', 'USD'),
    ('CVX', 'Chevron Corporation', 'EQUITY', 'ENERGY', 'USD'),
    ('SLB', 'SLB (Schlumberger N.V.)', 'EQUITY', 'ENERGY', 'USD'),
    -- Fixed Income
    ('BND', 'Vanguard Total Bond Market ETF', 'FIXED_INCOME', 'FINANCIALS', 'USD'),
    ('TLT', 'iShares 20+ Year Treasury Bond ETF', 'FIXED_INCOME', 'FINANCIALS', 'USD'),
    ('HYG', 'iShares iBoxx High Yield Corporate Bond ETF', 'FIXED_INCOME', 'FINANCIALS', 'USD'),
    ('AGG', 'iShares Core U.S. Aggregate Bond ETF', 'FIXED_INCOME', 'FINANCIALS', 'USD'),
    -- Commodities
    ('GLD', 'SPDR Gold Shares', 'COMMODITY', 'ENERGY', 'USD'),
    ('SLV', 'iShares Silver Trust', 'COMMODITY', 'ENERGY', 'USD'),
    ('USO', 'United States Oil Fund LP', 'COMMODITY', 'ENERGY', 'USD');

-- Seed 3 Portfolios
INSERT INTO portfolios (id, name, description, currency, cash_balance, created_by)
VALUES
    ('port_global_alpha_01', 'Global Multi-Asset Alpha Fund', 'Flagship institutional fund spanning equities, fixed income, and commodities', 'USD', 8420000.00, 'usr_pm_01'),
    ('port_tech_alpha_02', 'Technology Growth Alpha Fund', 'High-conviction active technology equity portfolio', 'USD', 2150000.00, 'usr_pm_01'),
    ('port_stress_test_large_03', 'Institutional High-Volume Stress Portfolio', 'Benchmark stress-test portfolio holding 500 positions across asset tranches', 'USD', 25000000.00, 'usr_pm_01');

-- Seed Positions for Portfolio 1: Global Multi-Asset Alpha Fund (10 positions)
INSERT INTO positions (id, portfolio_id, instrument_symbol, quantity, average_cost)
VALUES
    ('pos_01_aapl', 'port_global_alpha_01', 'AAPL', 50000.0000, 172.5000),
    ('pos_01_msft', 'port_global_alpha_01', 'MSFT', 35000.0000, 395.2000),
    ('pos_01_nvda', 'port_global_alpha_01', 'NVDA', 80000.0000, 110.4000),
    ('pos_01_googl', 'port_global_alpha_01', 'GOOGL', 40000.0000, 162.8000),
    ('pos_01_amzn', 'port_global_alpha_01', 'AMZN', 45000.0000, 170.2000),
    ('pos_01_jpm', 'port_global_alpha_01', 'JPM', 60000.0000, 185.0000),
    ('pos_01_gs', 'port_global_alpha_01', 'GS', 20000.0000, 430.5000),
    ('pos_01_bnd', 'port_global_alpha_01', 'BND', 150000.0000, 71.8000),
    ('pos_01_tlt', 'port_global_alpha_01', 'TLT', 100000.0000, 89.5000),
    ('pos_01_gld', 'port_global_alpha_01', 'GLD', 40000.0000, 208.2000);

-- Seed Positions for Portfolio 2: Technology Growth Alpha Fund (5 positions)
INSERT INTO positions (id, portfolio_id, instrument_symbol, quantity, average_cost)
VALUES
    ('pos_02_aapl', 'port_tech_alpha_02', 'AAPL', 20000.0000, 175.0000),
    ('pos_02_msft', 'port_tech_alpha_02', 'MSFT', 15000.0000, 405.0000),
    ('pos_02_nvda', 'port_tech_alpha_02', 'NVDA', 40000.0000, 115.0000),
    ('pos_02_meta', 'port_tech_alpha_02', 'META', 18000.0000, 465.0000),
    ('pos_02_tsla', 'port_tech_alpha_02', 'TSLA', 25000.0000, 178.0000);

-- Seed Positions for Portfolio 3: Institutional High-Volume Stress Portfolio (500 distinct position lots)
-- Using cross-generation across the 25 instruments and 20 tranches each (25 * 20 = 500 positions)
INSERT INTO positions (id, portfolio_id, instrument_symbol, quantity, average_cost)
SELECT
    'pos_stress_' || i.symbol || '_' || LPAD(CAST(s.lot AS VARCHAR), 3, '0'),
    'port_stress_test_large_03',
    i.symbol,
    CAST(1000 + (s.lot * 75) AS NUMERIC(18, 4)),
    CAST(50 + ((s.lot * 17) % 150) AS NUMERIC(18, 4))
FROM instruments i
CROSS JOIN (
    VALUES (1), (2), (3), (4), (5), (6), (7), (8), (9), (10),
           (11), (12), (13), (14), (15), (16), (17), (18), (19), (20)
) AS s(lot);

-- Seed Sample Trades
INSERT INTO trades (id, portfolio_id, instrument_symbol, side, quantity, price, total_amount, executed_at)
VALUES
    ('trd_01', 'port_global_alpha_01', 'AAPL', 'BUY', 10000.0000, 172.5000, 1725000.0000, CURRENT_TIMESTAMP),
    ('trd_02', 'port_global_alpha_01', 'NVDA', 'BUY', 20000.0000, 110.4000, 2208000.0000, CURRENT_TIMESTAMP),
    ('trd_03', 'port_global_alpha_01', 'MSFT', 'BUY', 5000.0000, 395.2000, 1976000.0000, CURRENT_TIMESTAMP),
    ('trd_04', 'port_tech_alpha_02', 'NVDA', 'BUY', 10000.0000, 115.0000, 1150000.0000, CURRENT_TIMESTAMP);

-- Seed Risk Limits
INSERT INTO risk_limits (id, portfolio_id, type, threshold, unit, enabled)
VALUES
    ('lim_01', 'port_global_alpha_01', 'VAR_95', 2500000.0000, '$', TRUE),
    ('lim_02', 'port_global_alpha_01', 'VAR_99', 3500000.0000, '$', TRUE),
    ('lim_03', 'port_global_alpha_01', 'CONCENTRATION', 15.0000, '%', TRUE),
    ('lim_04', 'port_global_alpha_01', 'DRAWDOWN', 2.5000, '%', TRUE),
    ('lim_05', 'port_tech_alpha_02', 'VAR_95', 1000000.0000, '$', TRUE),
    ('lim_06', 'port_stress_test_large_03', 'VAR_95', 10000000.0000, '$', TRUE);

-- Seed Alerts
INSERT INTO alerts (id, portfolio_id, risk_limit_id, type, severity, title, message, current_value, threshold_value, unit, acknowledged)
VALUES
    ('alt_01', 'port_global_alpha_01', 'lim_01', 'VAR_95', 'WARNING', 'VaR 95% Approaching Policy Cap', 'Parametric VaR reached $1,840,250 (73.6% of $2,500,000 threshold)', 1840250.0000, 2500000.0000, '$', FALSE),
    ('alt_02', 'port_global_alpha_01', 'lim_03', 'CONCENTRATION', 'INFO', 'Asset Concentration Advisory', 'NVDA weight reached 8.0%, monitored against 15.0% single asset cap', 8.0000, 15.0000, '%', FALSE),
    ('alt_03', 'port_global_alpha_01', 'lim_04', 'DRAWDOWN', 'INFO', 'Drawdown Normalization', 'Daily change stabilized at +0.38%', 0.3800, 2.5000, '%', TRUE);
