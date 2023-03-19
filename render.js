var xmlns = 'http://www.w3.org/2000/svg';
var apiURL = 'https://api.weather.gov/gridpoints/DTX/40,28/forecast/hourly';
var lineDomain = {
	'low': 150,
	'high': 500,
};

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
 * Render the page.
 */
var renderToday= function(weatherData) {
	var svg = document.querySelector('svg');
	var range = getMinMaxTemps(weatherData);

	for (var iter = 0; iter < weatherData.length; iter++) {
		drawRow(svg, iter, weatherData[iter], range);
	}
};

/**
 * Format the hour string for display
 */
var formatHour = function(hour) {
	if (hour === 0) {
		return '12 AM';
	}

	if (hour < 12) {
		return hour + ' AM';
	}

	if (hour === 12) {
		return hour + ' PM';
	}

	if (hour != 24) {
		return (hour % 12) + ' PM';
	}

	return hour;
};

var getPrecipChance = function(chance) {
	if (chance === 0) {
		return 'clear';
	}

	if (chance < 30) {
		return 'chance';
	}

	if (chance < 60) {
		return 'possible';
	}

	if (chance < 95) {
		return 'likely';
	}

	return 'falling';
};

var getConditionEmoji = function(chance) {
	switch(chance) {
		case 'clear': 
			return '🌞';
		case 'chance':
			return '🌤';
		case 'possible':
			return '☁';
		case 'likely':
			return '🌦';
		case 'falling':
			return '🌧';
	}

	return '?';
};

var getTempLineLength = function(temp, range) {
	var tempDiff = range.max - range.min;
	var curAboveMinPct = (temp - range.min) / tempDiff;
	var lineDiff = lineDomain.high - lineDomain.low;
	return (curAboveMinPct * lineDiff) + lineDomain.low;
};

/**
 * Is this hour in the evening? Display the moon?
 */
var isEvening = function(hour) {
	return ((hour < 8) || (hour > 19));
};

/**
 * Draw the SVG contents
 */
var drawRow = function(svg, iter, period, range) {
	var chance = getPrecipChance(period.precip);

	var periodDate = new Date(period.start);
	var hour = periodDate.getHours();
	var yloc = iter * 35;

	// precipitation block
	var rect = document.createElementNS(xmlns, 'rect');
	rect.setAttributeNS(null, 'y', yloc);
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
	var emoji = getConditionEmoji(chance);
	condition.textContent = emoji;
	if ((chance === 'clear') && isEvening(hour)) {
		condition.textContent = '🌙';
	}
	condition.setAttributeNS(null, 'x', 90);
	condition.setAttributeNS(null, 'y', yloc + 20);
	condition.classList.add('condition');
	svg.append(condition);

	// temperature line
	var lineLength = getTempLineLength(period.temp, range);
	var line = document.createElementNS(xmlns, 'line');
	line.setAttributeNS(null, 'x1', 150);
	line.setAttributeNS(null, 'x2', (lineLength - 10));
	line.setAttributeNS(null, 'y1', yloc + 15);
	line.setAttributeNS(null, 'y2', yloc + 15);
	svg.append(line);

	// temperature number
	var tempr = document.createElementNS(xmlns, 'text');
	tempr.textContent = period.temp + '°';
	tempr.setAttributeNS(null, 'x', lineLength);
	tempr.setAttributeNS(null, 'y', yloc + 20);
	if (period.temp < 33) {
		tempr.classList.add('freezing');
	}
	svg.append(tempr);
};

/**
 * Get the weather data from NOAA
 */
fetch(apiURL).then(function (response) {
	// The API call was successful!
	return response.json();
}).then(function (data) {
	var weatherData = formatData(data);

	var todayData = weatherData.slice(0, 15);
	renderToday(todayData);
}).catch(function (err) {
	// There was an error
	console.warn('Something went wrong.', err);
});

