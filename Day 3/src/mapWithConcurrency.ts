function mapWithConcurrency<T, R>(items: readonly T[], limit: number, process: (item: T, index: number) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
    if (typeof limit !== 'number' || limit <= 0 || !Number.isInteger(limit)) {
        return Promise.reject(new RangeError('Limit must be a positive integer'));
    }

    if (items.length === 0) {
        return Promise.resolve([]);
    }

    return new Promise<PromiseSettledResult<R>[]>((resolve) => {
        const results: PromiseSettledResult<R>[] = new Array(items.length);
        let nextIndex = 0;
        let activeCount = 0;
        let settledCount = 0;

        const settleCurrent = () => {
            activeCount -= 1;
            settledCount += 1;

            if (settledCount === items.length) {
                resolve(results);
                return;
            }

            launchNext();
        };

        const launchNext = () => {
            while (activeCount < limit && nextIndex < items.length) {
                const currentIndex = nextIndex;
                nextIndex += 1;
                activeCount += 1;

                let task: Promise<R>;
                const currentItem = items[currentIndex]!;

                try {
                    task = Promise.resolve(process(currentItem, currentIndex));
                } catch (error) {
                    results[currentIndex] = { status: 'rejected', reason: error };
                    activeCount -= 1;
                    settledCount += 1;
                    if (settledCount === items.length) {
                        resolve(results);
                        return;
                    }
                    continue;
                }

                task
                    .then((value) => {
                        results[currentIndex] = { status: 'fulfilled', value };
                        settleCurrent();
                    }, (reason) => {
                        results[currentIndex] = { status: 'rejected', reason };
                        settleCurrent();
                    });
            }
        };

        launchNext();
    });
}

export default mapWithConcurrency