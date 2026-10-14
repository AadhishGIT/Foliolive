import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@foliolive/ui';
import { BookOpen, Info, CheckCircle2 } from 'lucide-react';

export function MethodExplainerDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs flex items-center gap-1.5 border-slate-700 bg-slate-900"
          aria-label="Open Value-at-Risk methodology explainer"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          Methodology Explainer
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-5 h-5 text-blue-400" />
            <DialogTitle className="text-lg font-bold text-white">
              Institutional Risk Engine Methodology
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Formulas, assumptions, and validation standards documented in docs/risk-methodology.md
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs font-sans mt-3">
          {/* Parametric VaR */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                1. Parametric (Variance-Covariance) VaR
              </span>
              <Badge variant="outline">Analytical Model</Badge>
            </div>
            <p className="text-slate-300">
              Assumes returns are normally distributed. Computed via the analytical formula:
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-blue-300 border border-slate-800">
              VaR_alpha = Z_alpha * sigma_p * sqrt(delta_t) * Portfolio_Value
            </div>
            <p className="text-slate-400 text-[11px]">
              Where Z_0.95 = 1.6449, Z_0.99 = 2.3263, and sigma_p is portfolio standard deviation
              derived from the weighted asset covariance matrix.
            </p>
          </div>

          {/* Historical Simulation VaR */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                2. Historical Simulation VaR
              </span>
              <Badge variant="success">Non-Parametric</Badge>
            </div>
            <p className="text-slate-300">
              Does not assume normal distribution. Re-evaluates current portfolio holdings across
              the previous 250 empirical trading day return scenarios.
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-emerald-300 border border-slate-800">
              VaR_alpha = -Quantile(R_historical, 1 - alpha) * Portfolio_Value
            </div>
            <p className="text-slate-400 text-[11px]">
              Captures fat tails, volatility clustering, and observed skewness that parametric
              models understate.
            </p>
          </div>

          {/* Expected Shortfall */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                3. Expected Shortfall (CVaR)
              </span>
              <Badge variant="warning">Coherent Risk Measure</Badge>
            </div>
            <p className="text-slate-300">
              Measures the average loss occurring specifically in the tail beyond the VaR threshold.
            </p>
            <div className="p-2 rounded bg-slate-900 font-mono text-[11px] text-amber-300 border border-slate-800">
              ES_alpha = E[ Loss | Loss &gt; VaR_alpha ]
            </div>
            <p className="text-slate-400 text-[11px]">
              Satisfies sub-additivity: risk of a diversified portfolio cannot exceed the sum of
              individual portfolio risks.
            </p>
          </div>

          {/* Regulatory alignment */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Validated against Basel Committee on Banking Supervision (BCBS) standards and verified
              with Testcontainers and JUnit 5 unit tests.
            </span>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="default" size="sm" onClick={() => {}} className="w-full sm:w-auto">
            Got It
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
