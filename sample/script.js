import Intervals from '../build/index.js'

const intervals = new Intervals(document.querySelector('canvas'), {
	startVal: 0,
	endVal: 1,
	step: 0.01,
})

let items = [
	{
		id: 1,
		start: 0.2,
		end: 0.5,
		highlight: false,
	},
	{
		id: 2,
		start: 0.6,
		end: 0.8,
		highlight: false,
	},
]

intervals.setItems(items)

intervals.onItemClick = ({ id }) => {
	items = items.map((item) => {
		return { ...item, highlight: item.id === id }
	})
	intervals.setItems(items)
}

intervals.onUpdateItem = (item) => {
	const { id } = item
	let i = items.findIndex((item) => item.id === id)
	items[i] = item
	intervals.setItems(items)
}
