/**
 * Render the fresh weather SVG.
 */
var xmlns = 'http://www.w3.org/2000/svg';
var apiURL = 'https://api.weather.gov/gridpoints/DTX/40,28/forecast/hourly';
var lineDomain = {
	'low': 150,
	'high': 500,
};
var rowHeight = 35;
var numHourRows = 12;
var degreeMark = String.fromCodePoint('0x00B0');

/**
 * Take the weathr.gov JSON and grab the pieces we want.
 */
var formatData = function(data) {
	var weatherData = [],
		period, entry;

	for (var iter = 0; iter < data.properties.periods.length; iter += 2) {
		period = data.properties.periods[iter];
		entry = {
			'start': period.startTime,
			'end': period.endTime,
			'temp': period.temperature,
			'precip': period.probabilityOfPrecipitation.value,
		};
		weatherData.push(entry);
	}

	return weatherData;
};

/**
 * Examine the dataset and grab the min and max temps
 */
var getMinMaxTemps = function(periods) {
	var range = {
		'min': null,
		'max': null,
	};

	for (var iter = 0; iter < periods.length; iter++) {
		if ((range.min == null) || (periods[iter].temp < range.min)) {
			range.min = periods[iter].temp;
		}
		if ((range.max == null)  || (periods[iter].temp > range.max)) {
			range.max = periods[iter].temp;
		}
	}

	return range;
};

/**
 * Format the hour string for display
 */
var formatHour = function(hour) {
	if (hour === 0) { return '12 AM'; }
	if (hour < 12) { return hour + ' AM'; }
	if (hour === 12) { return hour + ' PM'; }
	if (hour != 24) { return (hour % 12) + ' PM'; }
	return hour;
};

var getPrecipChance = function(chance) {
	if (chance === 0) { return 'clear'; }
	if (chance < 30) { return 'chance'; }
	if (chance < 60) { return 'possible'; }
	if (chance < 95) { return 'likely'; }
	return 'falling';
};

var getConditionEmoji = function(chance, isEvening) {
	switch(chance) {
		case 'clear': 
			if (isEvening) {
				return String.fromCodePoint('0x1F319');
			}
			return String.fromCodePoint('0x1F31E');
		case 'chance':
			return String.fromCodePoint('0x1F324');
		case 'possible':
			return String.fromCodePoint('0x1F325');
		case 'likely':
			return String.fromCodePoint('0x1F326');
		case 'falling':
			return String.fromCodePoint('0x1F327');
	}

	return '?';
};

/**
 * Given a temperature value and a range, figure out how much of a percentage
 * this value is.
 */
var getTempRangePercent = function(temp, range) {
	var tempDiff = range.max - range.min;
	var curAboveMinPct = (temp - range.min) / tempDiff;
	var lineDiff = lineDomain.high - lineDomain.low;

	return (curAboveMinPct * lineDiff) + lineDomain.low;
};

/**
 * Render the hourly view for today.
 */
var renderToday = function(weatherData) {
	var svg = document.querySelector('svg'),
		range = getMinMaxTemps(weatherData);

	// hide the loader
	if (weatherData) {
		document.querySelector('#loading').style.display = 'none';
	}

	for (var iter = 0; iter < weatherData.length; iter++) {
		drawHourRow(svg, iter, weatherData[iter], range);
	}
};

/**
 *
 */
var getDateInIsoFormat = function() {
	var ddd = new Date();
	const offset = ddd.getTimezoneOffset();
	ddd = new Date(ddd.getTime() - (offset*60*1000));
	return ddd.toISOString().split('T')[0];
};

/**
 * Render the daily stats for the week
 */
var renderWeek = function(weatherData) {
	var svg = document.querySelector('svg'),
		weekRange = getMinMaxTemps(weatherData),
		today = new Date(),
		todayIso = getDateInIsoFormat(today),
		prevDate = todayIso,
		sliceDate = '',
		dayCount = 0,
		tranche = [];

	// divide up the remaining days into day-tranches
	for (var iter = 0; iter < weatherData.length; iter++) {
		sliceDate = weatherData[iter].start.slice(0, 10);

		// the first slice of a new date
		if (sliceDate !== prevDate) {
			if (tranche.length) {
				renderWeekDay(tranche, weekRange, dayCount);
			}
			tranche = [];
			tranche.push(weatherData[iter]);
			prevDate = sliceDate;
			dayCount++;
			continue;
		}

		tranche.push(weatherData[iter]);
		prevDate = sliceDate;
	}

	/*
	#!!#
	for (var iter = 0; iter < weatherData.length; iter++) {
		drawHourRow(svg, iter, weatherData[iter], range);
	}
	*/
	renderWeekDay(tranche, weekRange, dayCount);
};


/**
 * Is this hour in the evening? Display the moon?
 */
var isEvening = function(hour) {
	return ((hour < 8) || (hour > 19));
};

/**
 * Draw the SVG contents
 *
 * svg - querySelector element
 * iter - the row number
 * period - the object representing a period of time, starting with 1 hour
 * range - an object containing the min and max temperature for the entire
 *     group.
 */
var drawHourRow = function(svg, iter, period, range) {
	var chance = getPrecipChance(period.precip);
	var periodDate = new Date(period.start);
	var hour = periodDate.getHours();
	var yloc = (iter * rowHeight);

	// precipitation block
	var rect = document.createElementNS(xmlns, 'rect');
	rect.setAttributeNS(null, 'y', yloc);
	rect.setAttributeNS(null, 'height', rowHeight);
	rect.classList.add(chance);
	svg.append(rect);

	// hour
	var time = document.createElementNS(xmlns, 'text');
	time.textContent = formatHour(hour);
	time.setAttributeNS(null, 'x', 40);
	time.setAttributeNS(null, 'y', yloc + 20);
	svg.append(time);

	// condition
	var condition = document.createElementNS(xmlns, 'text');
	var emoji = getConditionEmoji(chance, isEvening(hour));
	condition.textContent = emoji;
	condition.setAttributeNS(null, 'x', 90);
	condition.setAttributeNS(null, 'y', yloc + 20);
	condition.classList.add('condition');
	svg.append(condition);

	// temperature line
	var lineLength = getTempRangePercent(period.temp, range);
	var line = document.createElementNS(xmlns, 'line');
	line.setAttributeNS(null, 'x1', 150);
	line.setAttributeNS(null, 'x2', lineLength);
	line.setAttributeNS(null, 'y1', yloc + 15);
	line.setAttributeNS(null, 'y2', yloc + 15);
	svg.append(line);

	// temperature number
	var tempr = document.createElementNS(xmlns, 'text');
	tempr.textContent = period.temp + degreeMark;
	tempr.setAttributeNS(null, 'x', lineLength + 10);
	tempr.setAttributeNS(null, 'y', yloc + 20);
	if (period.temp < 33) {
		tempr.classList.add('freezing');
	}
	svg.append(tempr);
};

/**
 *
 */
var getWorstWeather = function(tranche) {
	var precip = 0;

	for (var iter = 0; iter < tranche.length; iter++) {
		if (tranche[iter].precip > precip) {
			precip = tranche[iter].precip;
		}
	}

	return precip;
};

/**
 *
 */
var renderWeekDay = function(daySlices, weekRange, dayCount) {
	var range = getMinMaxTemps(daySlices),
		svg = document.querySelector('svg'),
		today = new Date(daySlices[0].start),
		yloc = (numHourRows * rowHeight) + (dayCount * rowHeight),
		precip = getWorstWeather(daySlices);


	console.log(range, weekRange);

	// day of week
	var day = document.createElementNS(xmlns, 'text');
	day.textContent = today.toLocaleDateString(undefined, {weekday: 'long'}).substring(0, 3);
	day.setAttributeNS(null, 'x', 40);
	day.setAttributeNS(null, 'y', yloc + 20);
	svg.append(day);

	// condition
	var condition = document.createElementNS(xmlns, 'text');
	var chance = getPrecipChance(precip);
	var emoji = getConditionEmoji(chance, false);
	condition.textContent = emoji;
	condition.setAttributeNS(null, 'x', 90);
	condition.setAttributeNS(null, 'y', yloc + 20);
	condition.classList.add('condition');
	svg.append(condition);

	// temperature line
	var spaceLength = getTempRangePercent(range.min, weekRange);
	var lineLength = getTempRangePercent(range.max, weekRange);
	var line = document.createElementNS(xmlns, 'line');
	line.classList.add('day_range');
	line.setAttributeNS(null, 'x1', spaceLength);
	line.setAttributeNS(null, 'x2', (lineLength - 10));
	line.setAttributeNS(null, 'y1', yloc + 15);
	line.setAttributeNS(null, 'y2', yloc + 15);
	svg.append(line);

	// min temperature number
	var tempMin = document.createElementNS(xmlns, 'text');
	tempMin.textContent = range.min + degreeMark;
	tempMin.setAttributeNS(null, 'x', spaceLength - 25);
	tempMin.setAttributeNS(null, 'y', yloc + 20);
	if (range.min < 33) {
		tempMin.classList.add('freezing');
	}
	svg.append(tempMin);

	// max temperature number
	var tempMax = document.createElementNS(xmlns, 'text');
	tempMax.textContent = range.max + degreeMark;
	tempMax.setAttributeNS(null, 'x', lineLength);
	tempMax.setAttributeNS(null, 'y', yloc + 20);
	if (range.max < 33) {
		tempMax.classList.add('freezing');
	}
	svg.append(tempMax);

};

/**
 * Get the weather data from NOAA
 */
fetch(apiURL).then(function (response) {
	// The API call was successful!
	return response.json();
}).then(function (data) {
	var weatherData = formatData(data);

	renderToday(weatherData.slice(0, numHourRows));
	renderWeek(weatherData);
}).catch(function (err) {
	// There was an error
	console.warn('Something went wrong.', err);
});
