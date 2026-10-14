import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../src';

describe('Input Component', () => {
  it('renders input associated with its label', () => {
    render(<Input label="Portfolio Name" placeholder="Enter name" />);
    const input = screen.getByLabelText(/portfolio name/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter name');
  });

  it('displays helper text linked via aria-describedby', () => {
    render(<Input label="Threshold Limit" helperText="Enter a numerical value in USD" />);
    const input = screen.getByLabelText(/threshold limit/i);
    const helper = screen.getByText(/enter a numerical value in usd/i);

    expect(helper).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(helper.id));
  });

  it('displays error message with role="alert" and aria-invalid="true"', () => {
    render(<Input label="VaR Limit" error="Limit must be greater than zero" />);
    const input = screen.getByLabelText(/var limit/i);
    const errorAlert = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(errorAlert).toHaveTextContent(/limit must be greater than zero/i);
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(errorAlert.id));
  });

  it('accepts typing from userEvent', async () => {
    const user = userEvent.setup();
    render(<Input label="Search" />);
    const input = screen.getByLabelText(/search/i);

    await user.type(input, 'AAPL');
    expect(input).toHaveValue('AAPL');
  });
});
