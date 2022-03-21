export const _sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const getDecimalPointLength = function (number: number) {
	const numbers = String(number).split('.');

	return numbers[1] ? numbers[1].length : 0;
};
