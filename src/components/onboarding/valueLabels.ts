import type { BaseFieldId } from '../../lib/baseFields';
import type { BaseInputs } from '../../lib/baseData';
import { formatCurrency, formatSliderValue } from '../../lib/format';

// Mirrors ControlsPanel's valueLabelForField override for these two fields - their tooltip says
// "adjust the slider until it matches your real take-home pay," so the derived monthly net dollar
// figure needs to actually be visible (both on the question screen and its section summary), not
// just the raw percentage.
const NET_KEEP_RATE_SALARY_FIELD: Partial<Record<BaseFieldId, BaseFieldId>> = {
  netKeepRatePct: 'salaryY0K',
  partnerNetKeepRatePct: 'partnerSalaryY0K',
};

/** Overrides a slider field's display value where the plain formatted number alone doesn't match
 *  what its tooltip promises - currently just Net keep rate's derived take-home pay. Returns
 *  undefined for every other field, so callers fall back to the field's own `formatSliderValue`. */
export function sliderValueLabelOverride(fieldId: BaseFieldId, value: number, baseInputs: BaseInputs): string | undefined {
  const salaryFieldId = NET_KEEP_RATE_SALARY_FIELD[fieldId];
  if (!salaryFieldId) {
    return undefined;
  }
  const derivedMonthlyNet = (baseInputs[salaryFieldId] * 1000 * value) / 100 / 12;
  return `${formatSliderValue(value, '%')} (${formatCurrency(derivedMonthlyNet)}/mo)`;
}
