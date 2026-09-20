import { describe, expect, it } from 'vitest';
import { signedDelta, weightedAverageCost } from './inventory';

describe('signedDelta', () => {
	it('purchase and adjustment increase stock', () => {
		expect(signedDelta('purchase', 10)).toBe(10);
		expect(signedDelta('adjustment', 3)).toBe(3);
	});

	it('an adjustment with direction "decrease" reduces stock', () => {
		expect(signedDelta('adjustment', 3, undefined, 'decrease')).toBe(-3);
		expect(signedDelta('adjustment', 3, undefined, 'increase')).toBe(3);
	});

	it('consumption, checkout, and disposal decrease stock', () => {
		expect(signedDelta('consumption', 5)).toBe(-5);
		expect(signedDelta('checkout', 2)).toBe(-2);
		expect(signedDelta('disposal', 1)).toBe(-1);
	});

	it('a returned or damaged item comes back to stock', () => {
		expect(signedDelta('return', 4, 'returned')).toBe(4);
		expect(signedDelta('return', 4, 'damaged')).toBe(4);
	});

	it('a lost item never comes back — the earlier checkout decrement stands', () => {
		expect(signedDelta('return', 4, 'lost')).toBe(0);
	});
});

describe('weightedAverageCost', () => {
	it('averages the old and new lots by quantity', () => {
		// 10 units @ 100 + 10 units @ 200 => 15 avg
		expect(weightedAverageCost(10, 100, 10, 200)).toBe(150);
	});

	it('is just the purchase price when there was no prior stock', () => {
		expect(weightedAverageCost(0, 0, 5, 300)).toBe(300);
	});

	it('weights a larger existing lot more heavily', () => {
		// 90 units @ 100 + 10 units @ 200 => 110 avg
		expect(weightedAverageCost(90, 100, 10, 200)).toBe(110);
	});

	it('rounds to the nearest minor unit', () => {
		// 3 units @ 100 + 1 unit @ 101 => 100.25 => rounds to 100
		expect(weightedAverageCost(3, 100, 1, 101)).toBe(100);
	});
});
