import { TargetType } from './target-type.js';
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function applyStep(value, step) {
    if (!step)
        return value;
    return Math.round(value / step) * step;
}
export class Target {
    interval;
    type;
    x;
    original;
    constructor(args) {
        this.interval = args.interval;
        this.type = args.targetType;
        this.x = args.x;
        this.original = { ...args.interval };
    }
    applyOffsetValue(value, min, max, step) {
        const { interval, type, original } = this;
        let { start, end } = original;
        switch (type) {
            case TargetType.Start:
                start = clamp(applyStep(start + value, step), min, Math.min(end, max));
                break;
            case TargetType.End:
                end = clamp(applyStep(end + value, step), Math.max(start, min), max);
                break;
            case TargetType.Whole:
                start = clamp(applyStep(start + value, step), min, max);
                end = clamp(applyStep(end + value, step), min, max);
        }
        interval.start = start;
        interval.end = end;
    }
}
//# sourceMappingURL=target.js.map