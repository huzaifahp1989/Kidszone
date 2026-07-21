import { describe, expect, it } from 'vitest'
import { calculatePledgePoints } from '@/app/api/pledge/submit/route'

describe('calculatePledgePoints', () => {
  it('awards 25 points for qualifying pledges', () => {
    expect(calculatePledgePoints(100)).toBe(25)
    expect(calculatePledgePoints(5)).toBe(25)
  })

  it('awards 0 points below 5 recitations', () => {
    expect(calculatePledgePoints(4)).toBe(0)
    expect(calculatePledgePoints(0)).toBe(0)
  })
})
