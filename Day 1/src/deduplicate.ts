type Event = {
    id: string,
    timestamp: number
}

function deduplicate(events: Event[], windowMS: number) : Event[] {
    const lastAcceptedById = new Map<string, number>()
    const result: Event[] = [];

    for(const event of events) {
        const last = lastAcceptedById.get(event.id)
        if(last === undefined || last + windowMS <= event.timestamp) {
            result.push(event)
            lastAcceptedById.set(event.id, event.timestamp)
        }
    }

    return result
}

export default deduplicate