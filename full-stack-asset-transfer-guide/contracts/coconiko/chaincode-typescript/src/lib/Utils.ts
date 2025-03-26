'use strict';
import { performance } from 'node:perf_hooks';

/**
 * Generates a simple unique identifier
 * @returns A string containing a unique identifier
 */
export function uid(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Generates a UUID v4 compliant string
 * @returns A string containing a UUID
 */
export function uuid(): string { // Public Domain/MIT
    let d = new Date().getTime(); // Timestamp
    let d2 = performance.now() * 1000; // Time in microseconds since page-load
    
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c: string): string => {
        let r = Math.random() * 16; // random number between 0 and 16
        if (d > 0) { // Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else { // Use microseconds since page-load
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}