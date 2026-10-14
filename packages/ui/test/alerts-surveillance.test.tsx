import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  LiveAlertFeed,
  type AlertFeedItem,
} from '../../../apps/alerts-mfe/src/components/LiveAlertFeed';
import { RiskLimitManager } from '../../../apps/alerts-mfe/src/components/RiskLimitManager';

const MOCK_ALERTS: AlertFeedItem[] = [
  {
    id: 'alt_01',
    title: 'VaR 95% Breach',
    message: 'Parametric VaR reached $2.6M',
    severity: 'CRITICAL',
    portfolioId: 'port_global_alpha_01',
    currentValue: 2600000,
    thresholdValue: 2500000,
    unit: '$',
    triggeredAt: '1 min ago',
    acknowledged: false,
  },
  {
    id: 'alt_02',
    title: 'Tech Exposure Warning',
    message: 'Tech exposure at 38%',
    severity: 'WARNING',
    portfolioId: 'port_global_alpha_01',
    currentValue: 38.0,
    thresholdValue: 40.0,
    unit: '%',
    triggeredAt: '10 mins ago',
    acknowledged: false,
  },
  {
    id: 'alt_03',
    title: 'Daily Drawdown Normal',
    message: 'Drawdown within limits',
    severity: 'INFO',
    portfolioId: 'port_global_alpha_01',
    currentValue: 0.5,
    thresholdValue: 3.0,
    unit: '%',
    triggeredAt: '30 mins ago',
    acknowledged: true,
  },
];

describe('Alerts Surveillance & Mandate Rules', () => {
  it('renders live alert feed with accessible polite live region', () => {
    const onAck = vi.fn();
    const onAckAll = vi.fn();

    const { container } = render(
      <LiveAlertFeed alerts={MOCK_ALERTS} onAcknowledge={onAck} onAcknowledgeAll={onAckAll} />
    );

    // Polite live region exists for assistive tech
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();

    // Renders active unacknowledged count
    expect(screen.getByText(/2 Unacknowledged Active Breaches/i)).toBeInTheDocument();
  });

  it('filters alerts by severity dropdown', () => {
    const onAck = vi.fn();
    const onAckAll = vi.fn();

    render(
      <LiveAlertFeed alerts={MOCK_ALERTS} onAcknowledge={onAck} onAcknowledgeAll={onAckAll} />
    );

    const severitySelect = screen.getByLabelText(/Filter alerts by severity/i);
    fireEvent.change(severitySelect, { target: { value: 'CRITICAL' } });

    expect(screen.getByText('VaR 95% Breach')).toBeInTheDocument();
    expect(screen.queryByText('Tech Exposure Warning')).not.toBeInTheDocument();
  });

  it('calls acknowledge callback when button is clicked', () => {
    const onAck = vi.fn();
    const onAckAll = vi.fn();

    render(
      <LiveAlertFeed alerts={MOCK_ALERTS} onAcknowledge={onAck} onAcknowledgeAll={onAckAll} />
    );

    const ackButtons = screen.getAllByRole('button', { name: /Acknowledge alert:/i });
    expect(ackButtons.length).toBe(2);

    fireEvent.click(ackButtons[0]!);
    expect(onAck).toHaveBeenCalledWith('alt_01');
  });

  it('restricts risk limit creation button for ROLE_VIEWER', () => {
    render(<RiskLimitManager userRole="ROLE_VIEWER" />);

    // Create Rule button should be disabled for viewer
    const createBtn = screen.getByRole('button', { name: /Create Rule/i });
    expect(createBtn).toBeDisabled();
    expect(screen.getByText(/Read-Only \(Requires PM Role\)/i)).toBeInTheDocument();
  });

  it('enables risk limit creation button for ROLE_PM', () => {
    render(<RiskLimitManager userRole="ROLE_PM" />);

    const createBtn = screen.getByRole('button', { name: /Create Rule/i });
    expect(createBtn).not.toBeDisabled();
  });
});
