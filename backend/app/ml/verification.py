import math
from typing import List, Dict, Any, Optional, Tuple
import numpy as np


def compute_continuous_metrics(obs: np.ndarray, pred: np.ndarray) -> Dict[str, float]:
    """
    Computes standard continuous meteorological verification metrics:
    - RMSE: Root Mean Square Error
    - MAE: Mean Absolute Error
    - Bias: Mean Forecast Error (Forecast - Observation)
    - Correlation: Pearson correlation coefficient r
    """
    if len(obs) == 0 or len(pred) == 0:
        return {"rmse": 0.0, "mae": 0.0, "bias": 0.0, "correlation": 0.0}

    errors = pred - obs
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    mae = float(np.mean(np.abs(errors)))
    bias = float(np.mean(errors))

    # Pearson correlation
    if np.std(obs) > 1e-6 and np.std(pred) > 1e-6:
        corr = float(np.corrcoef(obs, pred)[0, 1])
    else:
        corr = 0.0

    return {
        "rmse": round(rmse, 2),
        "mae": round(mae, 2),
        "bias": round(bias, 2),
        "correlation": round(corr, 3)
    }


def compute_categorical_metrics(
    obs: np.ndarray,
    pred: np.ndarray,
    threshold: float = 15.0
) -> Dict[str, Any]:
    """
    Computes 2x2 contingency table and categorical skill scores for rainfall threshold:
    - H: Hits (Obs >= thresh & Pred >= thresh)
    - M: Misses (Obs >= thresh & Pred < thresh)
    - F: False Alarms (Obs < thresh & Pred >= thresh)
    - C: Correct Negatives (Obs < thresh & Pred < thresh)

    Scores:
    - POD (Probability of Detection): H / (H + M)
    - FAR (False Alarm Ratio): F / (H + F)
    - CSI (Critical Success Index / Threat Score): H / (H + M + F)
    - ETS (Equitable Threat Score): (H - Hr) / (H + M + F - Hr)
      where Hr = ((H + M) * (H + F)) / N
    """
    n = len(obs)
    if n == 0:
        return {
            "hits": 0, "misses": 0, "false_alarms": 0, "correct_negatives": 0,
            "pod": 0.0, "far": 0.0, "csi": 0.0, "ets": 0.0, "threshold_mm": threshold
        }

    obs_event = (obs >= threshold)
    pred_event = (pred >= threshold)

    h = int(np.sum(obs_event & pred_event))
    m = int(np.sum(obs_event & ~pred_event))
    f = int(np.sum(~obs_event & pred_event))
    c = int(np.sum(~obs_event & ~pred_event))

    pod = round(h / (h + m), 3) if (h + m) > 0 else 0.0
    far = round(f / (h + f), 3) if (h + f) > 0 else 0.0
    csi = round(h / (h + m + f), 3) if (h + m + f) > 0 else 0.0

    hr = ((h + m) * (h + f)) / n if n > 0 else 0.0
    denominator = (h + m + f - hr)
    ets = round((h - hr) / denominator, 3) if abs(denominator) > 1e-6 else 0.0

    return {
        "hits": h,
        "misses": m,
        "false_alarms": f,
        "correct_negatives": c,
        "pod": pod,
        "far": far,
        "csi": csi,
        "ets": ets,
        "threshold_mm": threshold
    }


def compute_fractions_skill_score(
    obs_grid: Optional[np.ndarray],
    pred_grid: Optional[np.ndarray],
    window_size: int = 3,
    threshold: float = 15.0
) -> Tuple[Optional[float], str]:
    """
    Computes Fractions Skill Score (FSS) over a 2D spatial grid.
    FSS = 1 - (MSE_fraction / (MSE_ref))
    If spatial grid data is unavailable or insufficient, returns (None, explanation)
    in strict adherence to the No Fake Data policy.
    """
    if obs_grid is None or pred_grid is None or obs_grid.ndim != 2 or pred_grid.ndim != 2:
        return None, "FSS unavailable: sufficient spatial verification grid data not available."

    if obs_grid.shape[0] < window_size or obs_grid.shape[1] < window_size:
        return None, f"FSS unavailable: grid dimension ({obs_grid.shape}) is smaller than neighborhood window ({window_size}x{window_size})."

    # Compute binary exceedance
    iobs = (obs_grid >= threshold).astype(float)
    ipred = (pred_grid >= threshold).astype(float)

    # 2D moving window fractions using uniform box filter
    from scipy.ndimage import uniform_filter
    f_obs = uniform_filter(iobs, size=window_size, mode='constant')
    f_pred = uniform_filter(ipred, size=window_size, mode='constant')

    fbs = np.mean((f_pred - f_obs) ** 2)
    fbs_ref = np.mean(f_pred ** 2) + np.mean(f_obs ** 2)

    if fbs_ref < 1e-8:
        return 1.0, f"FSS computed at 1.0 (zero event fractions across {window_size}x{window_size} window)."

    fss = 1.0 - (fbs / fbs_ref)
    fss = max(0.0, min(1.0, round(float(fss), 3)))
    return fss, f"FSS computed successfully (window: {window_size}x{window_size} grid cells, threshold: {threshold} mm)."


class VerificationEngine:
    """
    Evaluates and records scientific verification metrics comparing
    Raw NWP baseline vs ML Regime-Aware Corrected Forecast.
    """

    def evaluate_forecasts(
        self,
        observations: List[float],
        raw_nwp: List[float],
        corrected: List[float],
        regimes: Optional[List[str]] = None,
        threshold: float = 15.0
    ) -> Dict[str, Any]:
        obs = np.array(observations, dtype=float)
        raw = np.array(raw_nwp, dtype=float)
        cor = np.array(corrected, dtype=float)

        raw_cont = compute_continuous_metrics(obs, raw)
        cor_cont = compute_continuous_metrics(obs, cor)

        raw_cat = compute_categorical_metrics(obs, raw, threshold)
        cor_cat = compute_categorical_metrics(obs, cor, threshold)

        # FSS spatial check (1D point series -> spatial grid not available)
        fss_val, fss_status = compute_fractions_skill_score(None, None, window_size=3, threshold=threshold)

        # Improvement percentages
        rmse_imprv = round(((raw_cont["rmse"] - cor_cont["rmse"]) / max(0.01, raw_cont["rmse"])) * 100, 1)
        mae_imprv = round(((raw_cont["mae"] - cor_cont["mae"]) / max(0.01, raw_cont["mae"])) * 100, 1)
        csi_imprv = round(((cor_cat["csi"] - raw_cat["csi"]) / max(0.01, raw_cat["csi"])) * 100, 1) if raw_cat["csi"] > 0 else 0.0

        # Regime-wise breakdown if regimes list is supplied
        regime_breakdown = []
        if regimes and len(regimes) == len(obs):
            for reg in sorted(list(set(regimes))):
                mask = np.array([r == reg for r in regimes])
                if np.sum(mask) >= 3:
                    sub_obs = obs[mask]
                    sub_raw = raw[mask]
                    sub_cor = cor[mask]

                    s_raw_cont = compute_continuous_metrics(sub_obs, sub_raw)
                    s_cor_cont = compute_continuous_metrics(sub_obs, sub_cor)
                    s_raw_cat = compute_categorical_metrics(sub_obs, sub_raw, threshold)
                    s_cor_cat = compute_categorical_metrics(sub_obs, sub_cor, threshold)

                    regime_breakdown.append({
                        "regime": reg,
                        "samples": int(np.sum(mask)),
                        "raw_rmse": s_raw_cont["rmse"],
                        "corrected_rmse": s_cor_cont["rmse"],
                        "raw_mae": s_raw_cont["mae"],
                        "corrected_mae": s_cor_cont["mae"],
                        "raw_csi": s_raw_cat["csi"],
                        "corrected_csi": s_cor_cat["csi"],
                        "raw_pod": s_raw_cat["pod"],
                        "corrected_pod": s_cor_cat["pod"],
                        "raw_far": s_raw_cat["far"],
                        "corrected_far": s_cor_cat["far"],
                    })

        return {
            "sample_count": len(obs),
            "threshold_mm": threshold,
            "raw_nwp": {
                **raw_cont,
                **raw_cat,
                "fss": fss_val,
                "fss_status": fss_status
            },
            "corrected": {
                **cor_cont,
                **cor_cat,
                "fss": fss_val,
                "fss_status": fss_status
            },
            "improvements": {
                "rmse_reduction_percent": rmse_imprv,
                "mae_reduction_percent": mae_imprv,
                "csi_gain_percent": csi_imprv
            },
            "regime_wise": regime_breakdown
        }


# Singleton instance
verification_engine = VerificationEngine()
