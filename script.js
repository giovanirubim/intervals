class Interval {
	constructor({
		id = 0,
		start = 0,
		end = 0,
		moveable = true,
		color = '#ccc',
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
	constructor({ interval = new Interval(), targetType = targetTypes.start }) {
		this.interval = interval
		this.targetType = targetType
	}
}

const cursor = {
	default: 'default',
	grab: 'grab',
	grabbing: 'grabbing',
	colResize: 'col-resize',
}

const minMouseDist = 3
const minMouseMove = 3

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
		const normalX = offsetX / width
		return startVal + normalX * (endVal - startVal)
	}
	valueToOffsetX(val) {
		const { width, startVal, endVal } = this
		const normalX = (val - startVal) / (endVal - startVal)
		return width * normalX
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
		canvas.addEventListener('mouseout', () => {
			this.setMouseIsDown(false)
			this.setMouseCoords(null, null)
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
		if (x === null) {
			this.handleMouseOut()
		} else {
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
	handleMouseDown() {
		this.startClick = {
			x: this.mouseX,
			y: this.mouseY,
			moved: false,
			target: this.getHoveredTarget(),
		}
	}
	handleMouseUp() {}
	handleMouseMove() {
		const target = this.getHoveredTarget()
		switch (target?.targetType) {
			case targetTypes.start:
				this.setCursor(cursor.colResize)
				break
			case targetTypes.end:
				this.setCursor(cursor.colResize)
				break
			case targetTypes.whole:
				this.setCursor(cursor.grab)
				break
			default:
				this.setCursor(cursor.default)
		}
	}
	handleMouseOut() {}
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

			target = new Target({ interval, targetType })
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
