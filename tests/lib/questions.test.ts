import { filingStatus, hasKids, hasPartnerIncome, ownsHome, socialSecurityEnabled, ssWithdrawalBridgeEnabled } from '@src/lib/questions';

describe('ownsHome', () => {
  it('is true only when housing is answered "own"', () => {
    expect(ownsHome({ housing: 'own' })).toBe(true);
    expect(ownsHome({ housing: 'rent' })).toBe(false);
    expect(ownsHome({})).toBe(false);
  });
});

describe('filingStatus', () => {
  it('is marriedJoint only when explicitly answered that way', () => {
    expect(filingStatus({ filingStatus: 'marriedJoint' })).toBe('marriedJoint');
  });

  it('defaults to single when unset or answered anything else', () => {
    expect(filingStatus({})).toBe('single');
    expect(filingStatus({ filingStatus: 'single' })).toBe('single');
    expect(filingStatus({ filingStatus: 'nonsense' })).toBe('single');
  });
});

describe('socialSecurityEnabled', () => {
  it('defaults to true (included) when unset', () => {
    expect(socialSecurityEnabled({})).toBe(true);
  });

  it('is false only when explicitly turned off', () => {
    expect(socialSecurityEnabled({ socialSecurityEnabled: false })).toBe(false);
  });

  it('is true when explicitly turned on', () => {
    expect(socialSecurityEnabled({ socialSecurityEnabled: true })).toBe(true);
  });
});

describe('hasPartnerIncome', () => {
  it('defaults to false when unset', () => {
    expect(hasPartnerIncome({})).toBe(false);
  });

  it('is true only when explicitly answered true', () => {
    expect(hasPartnerIncome({ hasPartnerIncome: true })).toBe(true);
    expect(hasPartnerIncome({ hasPartnerIncome: false })).toBe(false);
  });
});

describe('hasKids', () => {
  it('defaults to false when unset', () => {
    expect(hasKids({})).toBe(false);
  });

  it('is true only when explicitly answered true', () => {
    expect(hasKids({ hasKids: true })).toBe(true);
    expect(hasKids({ hasKids: false })).toBe(false);
  });
});

describe('ssWithdrawalBridgeEnabled', () => {
  it('defaults to false (off) when unset - an opt-in strategy, not a default assumption', () => {
    expect(ssWithdrawalBridgeEnabled({})).toBe(false);
  });

  it('is true only when explicitly turned on', () => {
    expect(ssWithdrawalBridgeEnabled({ ssWithdrawalBridgeEnabled: true })).toBe(true);
  });

  it('is false when explicitly turned off', () => {
    expect(ssWithdrawalBridgeEnabled({ ssWithdrawalBridgeEnabled: false })).toBe(false);
  });
});
