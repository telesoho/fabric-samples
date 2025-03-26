import { uid, uuid } from '../../lib/Utils';

describe('Utils', () => {
    describe('uid', () => {
        it('should generate a unique string', () => {
            const id1 = uid();
            const id2 = uid();
            
            expect(id1).toBeDefined();
            expect(typeof id1).toBe('string');
            expect(id1.length).toBeGreaterThan(0);
            
            // Test uniqueness
            expect(id1).not.toEqual(id2);
        });
        
        it('should generate multiple unique IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(uid());
            }
            
            // All IDs should be unique
            expect(ids.size).toBe(100);
        });
    });
    
    describe('uuid', () => {
        it('should generate a UUID v4 compliant string', () => {
            const id = uuid();
            
            expect(id).toBeDefined();
            expect(typeof id).toBe('string');
            
            // Check UUID format (8-4-4-4-12 hex digits with hyphens)
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });
        
        it('should generate multiple unique UUIDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(uuid());
            }
            
            // All UUIDs should be unique
            expect(ids.size).toBe(100);
        });
        
        it('should always have the UUID version 4 format', () => {
            for (let i = 0; i < 20; i++) {
                const id = uuid();
                
                // Version 4 UUIDs have the third segment start with '4'
                const segments = id.split('-');
                expect(segments[2].charAt(0)).toBe('4');
                
                // Variant 1 UUIDs have the fourth segment start with 8, 9, a, or b
                expect('89ab').toContain(segments[3].charAt(0));
            }
        });
    });
}); 