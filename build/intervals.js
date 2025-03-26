import { Color, Cursor, minMouseDist, minMouseMove } from './presets.js';
import { Target } from './target.js';
import { TargetType } from './target-type.js';
function closestValue(target, a, b) {
    const da = Math.abs(target - a);
    const db = Math.abs(target - b);
    return da <= db ? a : b;
}
function eventCoords(e) {
    const { offsetX, offsetY } = e;
    return [offsetX, offsetY];
}
function isLeftButton(buttonCode) {
    return buttonCode === 0;
}
function hasLeftButton(buttonsCode) {
    return (buttonsCode & 1) !== 0;
}
export class Intervals {
    canvas;
    ctx;
    width = 0;
    height = 0;
    startVal;
    endVal;
    minStart;
    maxEnd;
    zoomFactor;
    step;
    items;
    mouseX;
    mouseY;
    mouseIsDown;
    startClick;
    onUpdateItem;
    onUpdateView;
    onItemClick;
    constructor(canvas, options) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.startVal = options.startVal;
        this.endVal = options.endVal;
        this.minStart = options.minStart ?? -Infinity;
        this.maxEnd = options.maxEnd ?? Infinity;
        this.zoomFactor = options.zoomFactor ?? 1.1;
        this.step = options.step ?? 0;
        this.items = [];
        this.mouseX = null;
        this.mouseY = null;
        this.mouseIsDown = false;
        this.startClick = null;
        this.updateSizeInfo();
        this.bindMouseEvents();
    }
    setCursor(cursor) {
        this.canvas.style.cursor = cursor;
    }
    valueToOffsetX(value) {
        const { startVal, endVal, width } = this;
        return ((value - startVal) / (endVal - startVal)) * width;
    }
    pixelToValueRatio() {
        const { startVal, endVal, width } = this;
        return width / (endVal - startVal);
    }
    updateSizeInfo() {
        const { canvas } = this;
        this.width = canvas.width;
        this.height = canvas.height;
    }
    clearCanvas() {
        const { ctx, width, height } = this;
        ctx.clearRect(0, 0, width, height);
    }
    drawFrame() {
        const { ctx, width, height, items, startVal, endVal } = this;
        const itemHeight = height * 0.8;
        const itemStartY = (height - itemHeight) / 2;
        const mulX = width / (endVal - startVal);
        const sumX = -startVal * mulX;
        for (const item of items) {
            const { start, end } = item;
            const startX = start * mulX + sumX;
            const endX = end * mulX + sumX;
            if (endX < 0 || startX > width) {
                continue;
            }
            ctx.fillStyle = item.highlight ? Color.BlockHighlight : Color.Block;
            ctx.fillRect(startX, itemStartY, endX - startX, itemHeight);
            ctx.strokeStyle = Color.BlockEndLine;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(startX, itemStartY);
            ctx.lineTo(startX, itemStartY + itemHeight);
            ctx.moveTo(endX, itemStartY);
            ctx.lineTo(endX, itemStartY + itemHeight);
            ctx.stroke();
        }
    }
    updateFrame() {
        this.clearCanvas();
        this.drawFrame();
    }
    bindMouseEvents() {
        const { canvas } = this;
        canvas.addEventListener('mousedown', (e) => {
            this.setMouseCoords(...eventCoords(e));
            if (isLeftButton(e.button)) {
                this.setMouseIsDown(true);
            }
        });
        canvas.addEventListener('mouseover', (e) => {
            this.setMouseIsDown(hasLeftButton(e.buttons));
        });
        canvas.addEventListener('mousemove', (e) => {
            this.setMouseCoords(...eventCoords(e));
            if (!hasLeftButton(e.buttons)) {
                this.setMouseIsDown(false);
            }
        });
        canvas.addEventListener('mouseup', (e) => {
            this.setMouseCoords(...eventCoords(e));
            if (isLeftButton(e.button)) {
                this.setMouseIsDown(false);
            }
        });
        canvas.addEventListener('mouseleave', (e) => {
            this.setCursor(Cursor.Default);
        });
        canvas.addEventListener('wheel', (e) => {
            if (!this.mouseIsDown) {
                this.handleScroll(Math.sign(e.deltaY));
            }
        });
    }
    setMouseCoords(x, y) {
        const { mouseX, mouseY } = this;
        if (x === mouseX && y === mouseY)
            return;
        this.mouseX = x;
        this.mouseY = y;
        if (x !== null) {
            this.handleMouseMove();
        }
    }
    setMouseIsDown(mouseIsDown) {
        if (mouseIsDown === this.mouseIsDown)
            return;
        this.mouseIsDown = mouseIsDown;
        if (mouseIsDown) {
            this.handleMouseDown();
        }
        else {
            this.handleMouseUp();
        }
    }
    updateCursor() {
        const target = this.getHoveredTarget();
        if (!target) {
            this.setCursor(Cursor.Default);
            return;
        }
        if (this.startClick?.moved) {
            this.setCursor(Cursor.Grabbing);
            return;
        }
        switch (target?.type) {
            case TargetType.Start:
                this.setCursor(Cursor.ColResize);
                break;
            case TargetType.End:
                this.setCursor(Cursor.ColResize);
                break;
            case TargetType.Whole:
                this.setCursor(Cursor.Grab);
                break;
        }
    }
    handleMouseDown() {
        this.startClick = {
            x: this.mouseX,
            y: this.mouseY,
            moved: false,
            target: this.getHoveredTarget(),
        };
    }
    handleMouseUp() {
        if (!this.startClick) {
            return;
        }
        const { moved, target } = this.startClick;
        if (!moved && target) {
            this.onItemClick?.(target.interval);
        }
        this.startClick = null;
    }
    handleMouseMove() {
        const { startClick } = this;
        let rerender = false;
        if (startClick && startClick.target) {
            const { target } = startClick;
            if (!startClick.moved) {
                const dist = Math.hypot(this.mouseX - startClick.x, this.mouseY - startClick.y);
                startClick.moved = dist >= minMouseMove;
            }
            if (startClick.moved) {
                const dx = this.mouseX - startClick.x;
                const offsetValue = dx / this.pixelToValueRatio();
                target.applyOffsetValue(offsetValue, this.minStart, this.maxEnd, this.step);
                this.triggerUpdateHandler(target.interval);
                rerender = true;
            }
        }
        if (rerender) {
            this.updateFrame();
        }
        this.updateCursor();
    }
    handleScroll(sign) {
        const { zoomFactor, startVal, endVal, width, mouseX } = this;
        const scale = sign < 0 ? 1 / zoomFactor : zoomFactor;
        const range = endVal - startVal;
        const newRange = range * scale;
        const normalX = mouseX / width;
        const mouseVal = startVal + normalX * range;
        this.startVal = Math.max(this.minStart, mouseVal - newRange * normalX);
        this.endVal = Math.min(this.maxEnd, this.startVal + newRange);
        this.triggerViewUpdate();
        this.updateFrame();
    }
    getHoveredTarget() {
        const x = this.mouseX;
        let minDist = Infinity;
        let target = null;
        for (const interval of this.items) {
            const { start, end } = interval;
            const startX = this.valueToOffsetX(start);
            const endX = this.valueToOffsetX(end);
            const targetX = closestValue(x, startX, endX);
            const closestEndDist = Math.abs(targetX - x);
            if (closestEndDist > minDist)
                continue;
            const startDist = Math.abs(startX - x);
            const endDist = Math.abs(endX - x);
            let targetType = TargetType.Whole;
            if (startDist < endDist && startDist <= minMouseDist) {
                targetType = TargetType.Start;
            }
            else if (endDist < startDist && endDist <= minMouseDist) {
                targetType = TargetType.End;
            }
            else if (x < startX || x >= endX) {
                continue;
            }
            target = new Target({
                interval,
                targetType,
                x: targetType === TargetType.Whole ? x : targetX,
            });
            minDist = closestEndDist;
        }
        return target;
    }
    triggerUpdateHandler(item) {
        this.onUpdateItem?.(item);
    }
    triggerViewUpdate() {
        this.onUpdateView?.(this.startVal, this.endVal);
    }
    setItems(items) {
        this.items = items;
        this.updateFrame();
    }
    updateView(start, end) {
        if (start === this.startVal && end === this.endVal) {
            return;
        }
        this.startVal = start;
        this.endVal = end;
        this.updateFrame();
    }
    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.updateSizeInfo();
        this.updateFrame();
    }
}
//# sourceMappingURL=intervals.js.map