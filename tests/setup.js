// Configurazione comune dei test a proprietà: seme fisso (modificabile con FC_SEED)
// e 1.000 esecuzioni per proprietà, come da sezione 10.1 della specifica tecnica.
import fc from 'fast-check';

const seed = Number(process.env.FC_SEED ?? 20261118);
fc.configureGlobal({ seed, numRuns: Number(process.env.FC_RUNS ?? 1000) });
