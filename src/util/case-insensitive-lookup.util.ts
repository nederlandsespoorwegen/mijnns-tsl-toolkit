interface SomeApiEvent {
    headers?: { [key: string]: any } | null;
}

export function getCaseInsensitiveHeader(event: SomeApiEvent, header: string): string | null {
    const lowercaseHeaders = toLowerCaseKeys(event.headers || {});
    const lowercaseQuery = header.toLowerCase();
    return lowercaseHeaders[lowercaseQuery] || null;
}

export function toLowerCaseKeys(obj: { [key: string]: any }): { [key: string]: any } {
    return Object.keys(obj).reduce((total, key) => ({
        ...total,
        [key.toLowerCase()]: obj[key]
    }), {});
}
