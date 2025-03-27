import { IntervalItem } from './interval-item.js'
import { IntervalsOptions } from './intervals-options.js'
import { Color, Cursor, minMouseDist, minMouseMove } from './presets.js'
import { Target } from './target.js'
import { TargetType } from './target-type.js'

interface StartClick {
	x: number
	y: number
	moved: boolean
	target: Target | null
}

function closestValue(target: number, a: number, b: number): number {
	const da = Math.abs(target - a)
	const db = Math.abs(target - b)
	return da <= db ? a : b
}

function eventCoords(e: {
	offsetX: number
	offsetY: number
}): [number, number] {
	const { offsetX, offsetY } = e
	return [offsetX, offsetY]
}

function isLeftButton(buttonCode: number): boolean {
	return buttonCode === 0
}

function hasLeftButton(buttonsCode: number): boolean {
	return (buttonsCode & 1) !== 0
}

const defaultOptions = {
	startVal: 0,
	endVal: 0,
	minStart: -Infinity,
	maxEnd: Infinity,
	zoomFactor: 1.1,
	step: 0,
}

export class Intervals {
	private canvas: HTMLCanvasElement
	private ctx: CanvasRenderingContext2D
	private width: number = 0
	private height: number = 0

	private startVal: number = defaultOptions.startVal
	private endVal: number = defaultOptions.endVal
	private minStart: number = defaultOptions.minStart
	private maxEnd: number = defaultOptions.maxEnd
	private zoomFactor: number = defaultOptions.zoomFactor
	private step: number = defaultOptions.step

	private items: IntervalItem[] = []
	private mouseX: number | null = null
	private mouseY: number | null = null
	private mouseIsDown: boolean = false
	private startClick: StartClick | null = null
	private frameUpdateRequest: number | null = null
	private frameIsUpdated: boolean = false
	private eventListeners: { [key: string]: Function } = {}

	onUpdateItem?: (item: IntervalItem) => void
	onUpdateView?: (start: number, end: number) => void
	onItemClick?: (item: IntervalItem) => void

	constructor(canvas: HTMLCanvasElement, options: IntervalsOptions) {
		this.canvas = canvas
		this.ctx = canvas.getContext('2d')!

		this.setOptions(options)
		this.updateSizeInfo()
		this.bindEventListeners()
	}
	private requestFrameUpdate() {
		this.frameIsUpdated = false

		if (this.frameUpdateRequest !== null) return

		this.frameUpdateRequest = requestAnimationFrame(() => {
			this.frameUpdateRequest = null

			if (this.frameIsUpdated) return

			this.clearCanvas()
			this.drawFrame()
			this.frameIsUpdated = true
		})
	}
	private setCursor(cursor: Cursor) {
		this.canvas.style.cursor = cursor
	}
	private valueToOffsetX(value: number): number {
		const { startVal, endVal, width } = this
		return ((value - startVal) / (endVal - startVal)) * width
	}
	private pixelToValueRatio(): number {
		const { startVal, endVal, width } = this
		return width / (endVal - startVal)
	}
	private updateSizeInfo() {
		const { canvas } = this
		this.width = canvas.width
		this.height = canvas.height
	}
	private clearCanvas() {
		const { ctx, width, height } = this
		ctx.clearRect(0, 0, width, height)
	}
	private drawFrame() {
		const { ctx, width, height, items, startVal, endVal } = this
		const itemHeight = height * 0.8
		const itemStartY = (height - itemHeight) / 2
		const mulX = width / (endVal - startVal)
		const sumX = -startVal * mulX

		for (const item of items) {
			const { start, end } = item
			const startX = start * mulX + sumX
			const endX = end * mulX + sumX
			if (endX < 0 || startX > width) {
				continue
			}
			ctx.fillStyle = item.highlight ? Color.BlockHighlight : Color.Block
			ctx.fillRect(startX, itemStartY, endX - startX, itemHeight)

			ctx.strokeStyle = Color.BlockEndLine
			ctx.lineWidth = 2
			ctx.lineCap = 'round'
			ctx.beginPath()
			ctx.moveTo(startX, itemStartY)
			ctx.lineTo(startX, itemStartY + itemHeight)
			ctx.moveTo(endX, itemStartY)
			ctx.lineTo(endX, itemStartY + itemHeight)
			ctx.stroke()
		}
	}
	private bindEventListeners() {
		const { canvas } = this
		const mousedown = (e: MouseEvent) => {
			this.setMouseCoords(...eventCoords(e))
			if (isLeftButton(e.button)) {
				this.setMouseIsDown(true)
			}
		}
		const mouseover = (e: MouseEvent) => {
			this.setMouseIsDown(hasLeftButton(e.buttons))
		}
		const mousemove = (e: MouseEvent) => {
			this.setMouseCoords(...eventCoords(e))
			if (!hasLeftButton(e.buttons)) {
				this.setMouseIsDown(false)
			}
		}
		const mouseup = (e: MouseEvent) => {
			this.setMouseCoords(...eventCoords(e))
			if (isLeftButton(e.button)) {
				this.setMouseIsDown(false)
			}
		}
		const mouseleave = () => {
			this.setCursor(Cursor.Default)
		}
		const wheel = (e: WheelEvent) => {
			if (!this.mouseIsDown) {
				this.handleScroll(Math.sign(e.deltaY))
			}
		}

		canvas.addEventListener('mousedown', mousedown)
		canvas.addEventListener('mouseover', mouseover)
		canvas.addEventListener('mousemove', mousemove)
		canvas.addEventListener('mouseup', mouseup)
		canvas.addEventListener('mouseleave', mouseleave)
		canvas.addEventListener('wheel', wheel)

		this.eventListeners = {
			mousedown,
			mouseover,
			mousemove,
			mouseup,
			mouseleave,
			wheel,
		}
	}
	private setMouseCoords(x: number, y: number) {
		const { mouseX, mouseY } = this
		if (x === mouseX && y === mouseY) return

		this.mouseX = x
		this.mouseY = y
		if (x !== null) {
			this.handleMouseMove()
		}
	}
	private setMouseIsDown(mouseIsDown: boolean) {
		if (mouseIsDown === this.mouseIsDown) return

		this.mouseIsDown = mouseIsDown
		if (mouseIsDown) {
			this.handleMouseDown()
		} else {
			this.handleMouseUp()
		}
	}
	private updateCursor() {
		const target = this.getHoveredTarget()
		if (!target) {
			this.setCursor(Cursor.Default)
			return
		}
		if (this.startClick?.moved) {
			this.setCursor(Cursor.Grabbing)
			return
		}
		switch (target?.type) {
			case TargetType.Start:
				this.setCursor(Cursor.ColResize)
				break
			case TargetType.End:
				this.setCursor(Cursor.ColResize)
				break
			case TargetType.Whole:
				this.setCursor(Cursor.Grab)
				break
		}
	}
	private handleMouseDown() {
		this.startClick = {
			x: this.mouseX!,
			y: this.mouseY!,
			moved: false,
			target: this.getHoveredTarget(),
		}
	}
	private handleMouseUp() {
		if (!this.startClick) {
			return
		}
		const { moved, target } = this.startClick
		if (!moved && target) {
			this.onItemClick?.(target.interval)
		}
		this.startClick = null
	}
	private handleMouseMove() {
		const { startClick } = this
		if (startClick && startClick.target) {
			const { target } = startClick
			if (!startClick.moved) {
				const dist = Math.hypot(
					this.mouseX! - startClick.x,
					this.mouseY! - startClick.y
				)
				startClick.moved = dist >= minMouseMove
			}
			if (startClick.moved) {
				const dx = this.mouseX! - startClick.x
				const offsetValue = dx / this.pixelToValueRatio()
				target.applyOffsetValue(
					offsetValue,
					this.minStart,
					this.maxEnd,
					this.step
				)
				this.onUpdateItem?.(target.interval)
				this.requestFrameUpdate()
			}
		}
		this.updateCursor()
	}
	private handleScroll(sign: number) {
		const { zoomFactor, startVal, endVal, width, mouseX } = this
		const scale = sign < 0 ? 1 / zoomFactor : zoomFactor

		const range = endVal - startVal
		const newRange = range * scale
		const normalX = mouseX! / width
		const mouseVal = startVal + normalX * range

		this.startVal = Math.max(this.minStart, mouseVal - newRange * normalX)
		this.endVal = Math.min(this.maxEnd, this.startVal + newRange)

		this.onUpdateView?.(this.startVal, this.endVal)
		this.requestFrameUpdate()
	}
	private getHoveredTarget(): Target | null {
		const x = this.mouseX!

		let minDist = Infinity
		let target: Target | null = null

		for (const interval of this.items) {
			const { start, end } = interval
			const startX = this.valueToOffsetX(start)
			const endX = this.valueToOffsetX(end)
			const targetX = closestValue(x, startX, endX)

			const closestEndDist = Math.abs(targetX - x)
			if (closestEndDist > minDist) continue

			const startDist = Math.abs(startX - x)
			const endDist = Math.abs(endX - x)

			let targetType = TargetType.Whole

			if (startDist < endDist && startDist <= minMouseDist) {
				targetType = TargetType.Start
			} else if (endDist < startDist && endDist <= minMouseDist) {
				targetType = TargetType.End
			} else if (x < startX || x >= endX) {
				continue
			}

			target = new Target({
				interval,
				targetType,
				x: targetType === TargetType.Whole ? x : targetX,
			})
			minDist = closestEndDist
		}

		return target
	}
	setOptions(options: IntervalsOptions) {
		this.startVal = options.startVal
		this.endVal = options.endVal
		this.minStart = options.minStart ?? defaultOptions.minStart
		this.maxEnd = options.maxEnd ?? defaultOptions.maxEnd
		this.zoomFactor = options.zoomFactor ?? defaultOptions.zoomFactor
		this.step = options.step ?? defaultOptions.step
	}
	setItems(items: IntervalItem[]) {
		this.items = items
		this.requestFrameUpdate()
	}
	updateView(start: number, end: number) {
		if (start === this.startVal && end === this.endVal) {
			return
		}
		this.startVal = start
		this.endVal = end
		this.requestFrameUpdate()
	}
	resizeCanvas(width: number, height: number) {
		this.canvas.width = width
		this.canvas.height = height
		this.updateSizeInfo()
		this.requestFrameUpdate()
	}
	destroy() {
		const { canvas, eventListeners } = this
		for (const key in eventListeners) {
			const listener = eventListeners[key] as EventListener
			canvas.removeEventListener(key, listener)
		}
	}
}
