class Interval {
	constructor({
		id = 0,
		start = 0,
		end = 0,
		moveable = true,
		color = '#888',
	}) {
		this.id = id
		this.range = [start, end]
		this.moveable = moveable
		this.color = color
	}
	get start() {
		return this.range[0]
	}
	get end() {
		return this.range[1]
	}
	set start(val) {
		this.range[0] = val
	}
	set end(val) {
		this.range[1] = val
	}
}

const targetTypes = {
	start: 0,
	end: 1,
	whole: 2,
}

class Target {
	constructor({
		interval = new Interval(),
		targetType = targetTypes.start,
		x = 0,
	}) {
		this.interval = interval
		this.type = targetType
		this.x = x
	}
	increment(value) {
		switch (this.type) {
			case targetTypes.start:
				this.interval.start += value
				break
			case targetTypes.end:
				this.interval.end += value
				break
			case targetTypes.whole:
				this.interval.start += value
				this.interval.end += value
				break
		}
	}
}

const cursor = {
	default: 'default',
	grab: 'grab',
	grabbing: 'grabbing',
	colResize: 'col-resize',
}

const minMouseDist = 3
const minMouseMove = 2

class Intervals {
	constructor(canvas) {
		const ctx = canvas.getContext('2d')

		this.canvas = canvas
		this.ctx = ctx

		this.startVal = 0
		this.endVal = 10000

		this.minStart = 0
		this.maxEnd = Infinity

		this.width = 0
		this.height = 0

		// mouse
		this.mouseX = null
		this.mouseY = null
		this.mouseIsDown = false
		this.startClick = null

		this.items = [
			new Interval({ id: 1, start: 3000, end: 4000 }),
			new Interval({ id: 2, start: 4500, end: 8000, moveable: false }),
		]

		// settings
		this.zoomFactor = 1.1
		this.step = 1

		this.updateSizeInfo()
		this.bindMouseEvents()
	}
	applyStep(value) {
		const { step } = this
		if (step === 0) return value
		return Math.round(value / step) * step
	}
	setCursor(cursorType) {
		this.canvas.style.cursor = cursorType
	}
	offsetXToValue(offsetX) {
		const { width, startVal, endVal } = this
		return (offsetX / width) * (endVal - startVal) + startVal
	}
	valueToOffsetX(value) {
		const { startVal, endVal, width } = this
		return ((value - startVal) / (endVal - startVal)) * width
	}
	pixelToValueRatio() {
		const { startVal, endVal, width } = this
		return width / (endVal - startVal)
	}
	updateSizeInfo() {
		const { canvas } = this
		this.width = canvas.width
		this.height = canvas.height
	}
	clearCanvas() {
		const { ctx, width, height } = this
		ctx.clearRect(0, 0, width, height)
	}
	drawFrame() {
		const { ctx, width, height, items, startVal, endVal } = this
		const itemHeight = height * 0.8
		const itemStartY = (height - itemHeight) / 2
		const mulX = width / (endVal - startVal)
		const sumX = -startVal * mulX

		for (const item of items) {
			const {
				range: [start, end],
				color,
			} = item
			const startX = start * mulX + sumX
			const endX = end * mulX + sumX
			if (endX < 0 || startX > width) {
				continue
			}
			ctx.fillStyle = color
			ctx.fillRect(startX, itemStartY, endX - startX, itemHeight)

			ctx.strokeStyle = '#ccc'
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
	updateFrame() {
		this.clearCanvas()
		this.drawFrame()
	}
	bindMouseEvents() {
		const { canvas } = this
		canvas.addEventListener('mousedown', (e) => {
			this.setMouseCoords(...eventCoords(e))
			if (isLeftButton(e.button)) {
				this.setMouseIsDown(true)
			}
		})
		canvas.addEventListener('mouseover', (e) => {
			this.setMouseIsDown(hasLeftButton(e.buttons))
		})
		canvas.addEventListener('mousemove', (e) => {
			this.setMouseCoords(...eventCoords(e))
			if (!hasLeftButton(e.buttons)) {
				this.setMouseIsDown(false)
			}
		})
		canvas.addEventListener('mouseup', (e) => {
			this.setMouseCoords(...eventCoords(e))
			if (isLeftButton(e.button)) {
				this.setMouseIsDown(false)
			}
		})
		canvas.addEventListener('mouseleave', (e) => {
			this.setCursor(cursor.default)
		})
		canvas.addEventListener('wheel', (e) => {
			if (!this.mouseIsDown) {
				this.handleScroll(Math.sign(e.deltaY))
			}
		})
	}
	setMouseCoords(x, y) {
		const { mouseX, mouseY } = this
		if (x === mouseX && y === mouseY) return

		this.mouseX = x
		this.mouseY = y
		if (x !== null) {
			this.handleMouseMove()
		}
	}
	setMouseIsDown(mouseIsDown) {
		if (mouseIsDown === this.mouseIsDown) return

		this.mouseIsDown = mouseIsDown
		if (mouseIsDown) {
			this.handleMouseDown()
		} else {
			this.handleMouseUp()
		}
	}
	updateCursor() {
		const target = this.getHoveredTarget()
		if (!target) {
			this.setCursor(cursor.default)
			return
		}
		if (this.startClick?.moved) {
			this.setCursor(cursor.grabbing)
			return
		}
		switch (target?.type) {
			case targetTypes.start:
				this.setCursor(cursor.colResize)
				break
			case targetTypes.end:
				this.setCursor(cursor.colResize)
				break
			case targetTypes.whole:
				this.setCursor(cursor.grab)
				break
		}
	}
	handleMouseDown() {
		this.startClick = {
			x: this.mouseX,
			y: this.mouseY,
			lastX: this.mouseX,
			moved: false,
			target: this.getHoveredTarget(),
		}
	}
	handleMouseUp() {
		if (this.startClick) {
			this.startClick = null
		}
	}
	handleMouseMove() {
		const { startClick } = this
		let rerender = false
		if (startClick && startClick.target) {
			if (!startClick.moved) {
				const dist = Math.hypot(
					this.mouseX - startClick.x,
					this.mouseY - startClick.y
				)
				startClick.moved = dist >= minMouseMove
				startClick.lastX = startClick.target.x
			}
			if (startClick.moved) {
				const dx = this.mouseX - startClick.lastX
				startClick.target.increment(dx / this.pixelToValueRatio())
				startClick.lastX = this.mouseX
				rerender = true
			}
		}
		if (rerender) {
			this.updateFrame()
		}
		this.updateCursor()
	}
	handleScroll(sign) {
		const { zoomFactor, startVal, endVal, width, mouseX } = this
		const scale = sign < 0 ? 1 / zoomFactor : zoomFactor

		const range = endVal - startVal
		const newRange = range * scale
		const normalX = mouseX / width
		const mouseVal = startVal + normalX * range

		this.startVal = Math.max(this.minStart, mouseVal - newRange * normalX)
		this.endVal = Math.min(this.maxEnd, this.startVal + newRange)
		this.updateFrame()
	}
	getHoveredTarget() {
		const x = this.mouseX

		let minDist = Infinity
		let target = null

		for (const interval of this.items) {
			const { start, end } = interval
			const startX = this.valueToOffsetX(start)
			const endX = this.valueToOffsetX(end)
			const targetX = closestValue(x, startX, endX)

			const closestEndDist = Math.abs(targetX - x)
			if (closestEndDist > minDist) continue

			const startDist = Math.abs(startX - x)
			const endDist = Math.abs(endX - x)

			let targetType = targetTypes.whole

			if (startDist < endDist && startDist <= minMouseDist) {
				targetType = targetTypes.start
			} else if (endDist < startDist && endDist <= minMouseDist) {
				targetType = targetTypes.end
			} else if (x < startX || x >= endX) {
				continue
			}

			target = new Target({
				interval,
				targetType,
				x: targetType === targetTypes.whole ? x : targetX,
			})
			minDist = closestEndDist
		}

		return target
	}
}

const closestValue = (target, a, b) => {
	const da = Math.abs(target - a)
	const db = Math.abs(target - b)
	return da <= db ? a : b
}

const eventCoords = (e) => {
	const { offsetX, offsetY } = e
	return [offsetX, offsetY]
}

const isLeftButton = (buttonCode) => {
	return buttonCode === 0
}

const hasLeftButton = (buttonsCode) => {
	return (buttonsCode & 1) !== 0
}

const intervals = new Intervals(document.querySelector('canvas'))
intervals.drawFrame()
