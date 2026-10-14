import { startServer } from './server';

const port = Number(process.env.BFF_PORT || 4000);
const seed = Number(process.env.SIMULATION_SEED || 42);

startServer(port, seed);
