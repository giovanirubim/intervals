import { Interval } from './interval.js'
import { TargetType } from './target-type.js'

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

function applyStep(value: number, step: number): number {
	if (!step) return value
	return Math.round(value / step) * step
}

export class Target {
	interval: Interval
	type: TargetType
	x: number
	original: {
		start: number
		end: number
	}

	constructor(args: {
		interval: Interval
		targetType: TargetType
		x: number
	}) {
		this.interval = args.interval
		this.type = args.targetType
		this.x = args.x
		this.original = { ...args.interval }
	}

	applyOffsetValue(value: number, min: number, max: number, step: number) {
		const { interval, type, original } = this
		let { start, end } = original
		switch (type) {
			case TargetType.Start:
				start = clamp(
					applyStep(start + value, step),
					min,
					Math.min(end, max)
				)
				break
			case TargetType.End:
				end = clamp(
					applyStep(end + value, step),
					Math.max(start, min),
					max
				)
				break
			case TargetType.Whole:
				start = clamp(applyStep(start + value, step), min, max)
				end = clamp(applyStep(end + value, step), min, max)
		}
		interval.start = start
		interval.end = end
	}
}
