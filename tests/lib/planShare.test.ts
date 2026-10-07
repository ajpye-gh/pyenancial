import { freshPlan } from '@src/lib/plans';
import { buildShareUrl, clearSharedPlanFromLocation, readSharedPlanFromLocation } from '@src/lib/planShare';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('buildShareUrl / readSharedPlanFromLocation', () => {
  it('round-trips a plan through a share URL', () => {
    const plan = freshPlan();
    window.history.replaceState(null, '', buildShareUrl(plan));

    expect(readSharedPlanFromLocation()).toEqual({ present: true, plan });
  });

  it('drops any pre-existing query params and hash, keeping only the plan param', () => {
    window.history.replaceState(null, '', '/?foo=bar#section');

    const url = new URL(buildShareUrl(freshPlan()));

    expect(url.hash).toBe('');
    expect(url.searchParams.get('foo')).toBeNull();
    expect(url.searchParams.has('plan')).toBe(true);
  });

  it('reports no param present when the URL has none', () => {
    window.history.replaceState(null, '', '/');

    expect(readSharedPlanFromLocation()).toEqual({ present: false });
  });

  it('reports present with a null plan for an undecodable param', () => {
    window.history.replaceState(null, '', '/?plan=not-valid-base64!!!');

    expect(readSharedPlanFromLocation()).toEqual({ present: true, plan: null });
  });

  it('reports present with a null plan for a decodable but invalid-shaped plan', () => {
    const encoded = btoa(JSON.stringify({ nope: true }));
    window.history.replaceState(null, '', `/?plan=${encoded}`);

    expect(readSharedPlanFromLocation()).toEqual({ present: true, plan: null });
  });
});

describe('clearSharedPlanFromLocation', () => {
  it('strips the plan param back out, restoring the base URL', () => {
    window.history.replaceState(null, '', buildShareUrl(freshPlan()));

    clearSharedPlanFromLocation();

    expect(window.location.search).toBe('');
  });

  it('leaves other query params untouched', () => {
    window.history.replaceState(null, '', '/?plan=xyz&foo=bar');

    clearSharedPlanFromLocation();

    expect(new URLSearchParams(window.location.search).get('plan')).toBeNull();
    expect(new URLSearchParams(window.location.search).get('foo')).toBe('bar');
  });
});
