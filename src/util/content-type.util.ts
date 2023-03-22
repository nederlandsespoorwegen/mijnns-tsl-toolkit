import { ParseJsonOptions, SupportedContentTypes } from '../models';

/**
 * Return the media-type directive of the given Content-Type field or null if it's missing
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
 */
export function extractMediaType(contentType: string): string | undefined {
    if (contentType) {
        const parts = contentType.split(';');
        if (parts[0]) {
            return parts[0].trim();
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
}

export function isSupportedContentType(supported: SupportedContentTypes, target: string | undefined): boolean {
    return supported.some(value => {
        if (value == undefined) {
            return target == undefined;
        }
        return value === target;
    });
}

export function shouldJsonParseEventBody(parseJson: ParseJsonOptions = ['application/json', undefined], contentType: string | undefined): boolean {
    if (typeof parseJson === 'boolean') {
        return parseJson;
    }

    return isSupportedContentType(parseJson as SupportedContentTypes, contentType);
}
