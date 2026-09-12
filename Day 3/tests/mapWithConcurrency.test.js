import { describe, expect, it, vi } from 'vitest';

async function loadMapWithConcurrency() {
	const module = await import('../src/mapWithConcurrency.ts');
	const mapWithConcurrency = module.mapWithConcurrency ?? module.default;

	if (typeof mapWithConcurrency !== 'function') {
		throw new Error('mapWithConcurrency export was not found');
	}

	return mapWithConcurrency;
}

function createDeferred() {
	let resolve;
	let reject;

	const promise = new Promise((promiseResolve, promiseReject) => {
		resolve = promiseResolve;
		reject = promiseReject;
	});

	return {
		promise,
		resolve,
		reject,
	};
}

async function flushMicrotasks() {
	await Promise.resolve();
	await Promise.resolve();
}

describe('mapWithConcurrency', () => {
	it('rejects with RangeError for invalid limits before calling process', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const process = vi.fn();

		await expect(mapWithConcurrency([], 0, process)).rejects.toBeInstanceOf(RangeError);
		await expect(mapWithConcurrency([], -1, process)).rejects.toBeInstanceOf(RangeError);
		await expect(mapWithConcurrency([], 1.5, process)).rejects.toBeInstanceOf(RangeError);
		await expect(mapWithConcurrency([], Number.NaN, process)).rejects.toBeInstanceOf(RangeError);
		await expect(mapWithConcurrency([], Number.POSITIVE_INFINITY, process)).rejects.toBeInstanceOf(RangeError);

		expect(process).not.toHaveBeenCalled();
	});

	it('returns an empty array for empty input with a valid limit', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const process = vi.fn();

		await expect(mapWithConcurrency([], 1, process)).resolves.toEqual([]);
		expect(process).not.toHaveBeenCalled();
	});

	it('rejects when items contains undefined', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const process = vi.fn();

		await expect(mapWithConcurrency([undefined], 1, process)).rejects.toBeInstanceOf(TypeError);
		expect(process).not.toHaveBeenCalled();
	});

	it('runs sequentially when the limit is 1', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const items = ['a', 'b', 'c'];
		const deferreds = items.map(() => createDeferred());
		const started = [];

		const process = vi.fn((item, index) => {
			started.push(index);
			return deferreds[index].promise.then(() => `${item}-done`);
		});

		const resultPromise = mapWithConcurrency(items, 1, process);

		await flushMicrotasks();
		expect(started).toEqual([0]);

		deferreds[0].resolve();
		await flushMicrotasks();
		expect(started).toEqual([0, 1]);

		deferreds[1].resolve();
		await flushMicrotasks();
		expect(started).toEqual([0, 1, 2]);

		deferreds[2].resolve();

		await expect(resultPromise).resolves.toEqual([
			{ status: 'fulfilled', value: 'a-done' },
			{ status: 'fulfilled', value: 'b-done' },
			{ status: 'fulfilled', value: 'c-done' },
		]);
	});

	it('starts every item immediately when the limit exceeds the number of items and preserves result order', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const items = ['a', 'b', 'c'];
		const deferreds = items.map(() => createDeferred());
		const started = [];

		const process = vi.fn((item, index) => {
			started.push(index);
			return deferreds[index].promise.then(() => `${item}-value`);
		});

		const resultPromise = mapWithConcurrency(items, 10, process);

		await flushMicrotasks();
		expect(started).toEqual([0, 1, 2]);

		deferreds[2].resolve();
		deferreds[0].resolve();
		deferreds[1].resolve();

		await expect(resultPromise).resolves.toEqual([
			{ status: 'fulfilled', value: 'a-value' },
			{ status: 'fulfilled', value: 'b-value' },
			{ status: 'fulfilled', value: 'c-value' },
		]);
	});

	it('keeps the original order when completions happen out of order', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const items = ['a', 'b', 'c', 'd'];
		const deferreds = items.map(() => createDeferred());

		const process = vi.fn((item, index) => deferreds[index].promise.then(() => `${item}-result`));

		const resultPromise = mapWithConcurrency(items, 2, process);

		await flushMicrotasks();
		deferreds[1].resolve();
		await flushMicrotasks();
		deferreds[2].resolve();
		await flushMicrotasks();
		deferreds[3].resolve();
		await flushMicrotasks();
		deferreds[0].resolve();

		await expect(resultPromise).resolves.toEqual([
			{ status: 'fulfilled', value: 'a-result' },
			{ status: 'fulfilled', value: 'b-result' },
			{ status: 'fulfilled', value: 'c-result' },
			{ status: 'fulfilled', value: 'd-result' },
		]);
	});

	it('records rejections and synchronous throws while continuing with later items', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const items = ['a', 'b', 'c', 'd'];
		const deferred0 = createDeferred();
		const deferred2 = createDeferred();
		const deferred3 = createDeferred();
		const error0 = new Error('error-0');
		const error1 = new Error('error-1');
		const started = [];

		const process = vi.fn((item, index) => {
			started.push(index);

			if (index === 0) {
				return deferred0.promise.then(() => `${item}-ok`);
			}

			if (index === 1) {
				throw error1;
			}

			if (index === 2) {
				return deferred2.promise.then(() => `${item}-ok`);
			}

			return deferred3.promise.then(() => `${item}-ok`);
		});

		const resultPromise = mapWithConcurrency(items, 2, process);

		await flushMicrotasks();
		expect(started).toEqual([0, 1, 2]);

		deferred2.resolve();
		await flushMicrotasks();
		expect(started).toEqual([0, 1, 2, 3]);

		deferred3.resolve();
		deferred0.reject(error0);

		await expect(resultPromise).resolves.toEqual([
			{ status: 'rejected', reason: error0 },
			{ status: 'rejected', reason: error1 },
			{ status: 'fulfilled', value: 'c-ok' },
			{ status: 'fulfilled', value: 'd-ok' },
		]);
	});

	it('never exceeds the configured concurrency limit', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const items = [0, 1, 2, 3, 4];
		const deferreds = items.map(() => createDeferred());
		let active = 0;
		let maxActive = 0;

		const process = vi.fn((item, index) => {
			active += 1;
			maxActive = Math.max(maxActive, active);

			return deferreds[index].promise.finally(() => {
				active -= 1;
			});
		});

		const resultPromise = mapWithConcurrency(items, 2, process);

		await flushMicrotasks();
		expect(maxActive).toBe(2);

		deferreds[0].resolve('a');
		await flushMicrotasks();
		expect(maxActive).toBe(2);

		deferreds[1].resolve('b');
		await flushMicrotasks();
		expect(maxActive).toBe(2);

		deferreds[2].resolve('c');
		await flushMicrotasks();
		expect(maxActive).toBe(2);

		deferreds[3].resolve('d');
		await flushMicrotasks();
		expect(maxActive).toBe(2);

		deferreds[4].resolve('e');

		await expect(resultPromise).resolves.toEqual([
			{ status: 'fulfilled', value: 'a' },
			{ status: 'fulfilled', value: 'b' },
			{ status: 'fulfilled', value: 'c' },
			{ status: 'fulfilled', value: 'd' },
			{ status: 'fulfilled', value: 'e' },
		]);
		expect(maxActive).toBe(2);
	});

	it('starts a new item as soon as capacity is freed, even if an earlier item is still pending', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const items = ['a', 'b', 'c'];
		const deferreds = items.map(() => createDeferred());
		const started = [];

		const process = vi.fn((item, index) => {
			started.push(index);
			return deferreds[index].promise.then(() => `${item}-ready`);
		});

		const resultPromise = mapWithConcurrency(items, 2, process);

		await flushMicrotasks();
		expect(started).toEqual([0, 1]);

		deferreds[1].resolve();
		await flushMicrotasks();

		expect(started).toEqual([0, 1, 2]);

		deferreds[0].resolve();
		deferreds[2].resolve();

		await expect(resultPromise).resolves.toEqual([
			{ status: 'fulfilled', value: 'a-ready' },
			{ status: 'fulfilled', value: 'b-ready' },
			{ status: 'fulfilled', value: 'c-ready' },
		]);
	});

	it('handles 20000 synchronous executions with limit 1 without overflowing the stack', async () => {
		const mapWithConcurrency = await loadMapWithConcurrency();
		const items = Array.from({ length: 20000 }, (_, index) => index);
		const process = vi.fn((item) => Promise.resolve(item * 2));

		await expect(mapWithConcurrency(items, 1, process)).resolves.toHaveLength(20000);
		expect(process).toHaveBeenCalledTimes(20000);
	});
});
