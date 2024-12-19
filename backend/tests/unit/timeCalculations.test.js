const { calculateSlotStartTime, hasTimeRelatedChanges } = require('../../src/utils/timeCalculations');

describe('Time Calculations', () => {
    describe('calculateSlotStartTime', () => {
        it('should calculate correct start time for first slot', () => {
            const eventStart = new Date('2024-03-01T19:00:00Z');
            const slotNumber = 1;
            const slotDuration = { minutes: 10 };
            const setupDuration = { minutes: 5 };

            const result = calculateSlotStartTime(eventStart, slotNumber, slotDuration, setupDuration);
            expect(result).toEqual(eventStart);
        });

        it('should calculate correct start time for later slots', () => {
            const eventStart = new Date('2024-03-01T19:00:00Z');
            const slotNumber = 3;
            const slotDuration = { minutes: 10 };
            const setupDuration = { minutes: 5 };

            const result = calculateSlotStartTime(eventStart, slotNumber, slotDuration, setupDuration);
            const expected = new Date('2024-03-01T19:30:00Z');
            expect(result).toEqual(expected);
        });
    });

    describe('hasTimeRelatedChanges', () => {
        it('should detect start time changes', () => {
            const original = {
                start_time: '2024-03-01T19:00:00Z',
                slot_duration: { minutes: 10 },
                setup_duration: { minutes: 5 }
            };
            const updated = {
                start_time: '2024-03-01T20:00:00Z'
            };

            expect(hasTimeRelatedChanges(original, updated)).toBe(true);
        });

        it('should detect duration changes', () => {
            const original = {
                start_time: '2024-03-01T19:00:00Z',
                slot_duration: { minutes: 10 },
                setup_duration: { minutes: 5 }
            };
            const updated = {
                slot_duration: { minutes: 15 }
            };

            expect(hasTimeRelatedChanges(original, updated)).toBe(true);
        });
    });
});
