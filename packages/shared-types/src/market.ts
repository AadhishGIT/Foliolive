import { z } from 'zod';

export interface MarketTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export const SimulatorControlSchema = z.object({
  stressMode: z.boolean().optional(),
  tickIntervalMs: z.number().int().min(5).max(5000).optional(),
  triggerShock: z.boolean().optional(),
  shockMagnitude: z.number().min(-0.5).max(0.5).optional(),
  shockSector: z.string().optional(),
  resetPrices: z.boolean().optional(),
});

export type SimulatorControl = z.infer<typeof SimulatorControlSchema>;

export interface SimulatorStatus {
  running: boolean;
  stressMode: boolean;
  tickIntervalMs: number;
  ticksPerSecond: number;
  totalTicks: number;
  instrumentCount: number;
  uptimeSeconds: number;
}
