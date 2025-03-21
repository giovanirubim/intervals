import Intervals from '../build/index.js'

const intervals = new Intervals(document.querySelector('canvas'), {
	startVal: 0,
	endVal: 1,
	step: 0.01,
})

intervals.setItems([
	{
		start: 0.2,
		end: 0.5,
	},
	{
		start: 0.6,
		end: 0.8,
	},
])
