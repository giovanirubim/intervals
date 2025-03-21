import { Interval } from './interval.js';
import { IntervalsOptions } from './intervals-options.js';
import { Target } from './target.js';
interface StartClick {
    x: number;
    y: number;
    moved: boolean;
    target: Target | null;
}
export declare class Intervals {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    startVal: number;
    endVal: number;
    minStart: number;
    maxEnd: number;
    zoomFactor: number;
    step: number;
    items: Interval[];
    mouseX: number | null;
    mouseY: number | null;
    mouseIsDown: boolean;
    startClick: StartClick | null;
    itemUpdateHandler?: (item: Interval) => void;
    viewRangeUpdateHandler?: (start: number, end: number) => void;
    constructor(canvas: HTMLCanvasElement, options: IntervalsOptions);
    setItems(items: Interval[]): void;
    private setCursor;
    private valueToOffsetX;
    private pixelToValueRatio;
    private updateSizeInfo;
    private clearCanvas;
    private drawFrame;
    private updateFrame;
    private bindMouseEvents;
    private setMouseCoords;
    private setMouseIsDown;
    private updateCursor;
    private handleMouseDown;
    private handleMouseUp;
    private handleMouseMove;
    private handleScroll;
    private getHoveredTarget;
    private triggerUpdateHandler;
    private triggerViewRangeUpdate;
}
export {};
