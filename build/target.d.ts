import { IntervalItem } from './interval-item.js';
import { TargetType } from './target-type.js';
export declare class Target {
    interval: IntervalItem;
    type: TargetType;
    x: number;
    original: {
        start: number;
        end: number;
    };
    constructor(args: {
        interval: IntervalItem;
        targetType: TargetType;
        x: number;
    });
    applyOffsetValue(value: number, min: number, max: number, step: number): void;
}
