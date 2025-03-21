import { Interval } from './interval.js';
import { TargetType } from './target-type.js';
export declare class Target {
    interval: Interval;
    type: TargetType;
    x: number;
    original: {
        start: number;
        end: number;
    };
    constructor(args: {
        interval: Interval;
        targetType: TargetType;
        x: number;
    });
    applyOffsetValue(value: number, min: number, max: number, step: number): void;
}
