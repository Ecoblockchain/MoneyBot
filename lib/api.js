const http = require('http');
const https = require('https');
const domain = require('domain');

var APIs = {
    anagram: (data, apikey, callback) => {
        const options = {
        	host: 'anagramgenius.com',
        	path: '/server.php?' + 'source_text=' + encodeURI(data) + '&vulgar=1',
        	timeout: 20
        };

        urlRetrieve(http, options, (status, resp) => {
        	const matched  = resp.match(/.*<span class="black-18">'(.*)'<\/span>/);

        	callback(matched);
        });
    },
    // API call to weatherunderground.com for weather
    weather: (data, apikey, callback) => {
        var query = '';
        var options = {};

        if (data.split(' ').length === 1) {
            options = {
                host: 'api.wunderground.com',
                path: '/api/' + apikey + '/conditions/q/' + data + '.json',
                timeout: 20
            };

            urlRetrieve(http, options, function(status, data) {
                callback(data);
            });

            return;
        }

        try {
            var stringData = data.split(' ');

            // Strip off the country
            var country = stringData[stringData.length - 1];
            stringData.splice(stringData.length - 1, 1);

            var fixedString = '';

            // Put the location together for the query
            for (var k in stringData) {
                fixedString += stringData[k] + '_';
            }

            // Trim off the last _
            fixedString = fixedString.slice(0, fixedString.lastIndexOf('_'));

            query = country + '/' + fixedString;
            options = {
                host: 'api.wunderground.com',
                path: '/api/' + apikey + '/conditions/q/' + query + '.json',
                timeout: 20
            };

            urlRetrieve(http, options, (status, data) => {
                return callback(data);
            });
        } catch (e) {
            console.log(e);
        }
    }, // end weather

    // API call to weatherunderground.com for forecasts
    forecast: (data, apikey, callback) => {
        var query = '';
        var options = {};

        if (data.split(' ').length === 1) {
            options = {
                host: 'api.wunderground.com',
                path: '/api/' + apikey + '/conditions/forecast/q/' + data + '.json',
                timeout: 20
            }

            urlRetrieve(http, options, (status, data) => {
                callback(data);
            });

            return;
        }

        try {
            var stringData = data.split(' ');
            // Strip off the country
            var country = stringData[stringData.length - 1];
            stringData.splice(stringData.length - 1, 1);

            var fixedString = '';

            // Put the location together for the query
            for (var k in stringData) {
                fixedString += stringData[k] + '_';
            }

            // Trim off the last _
            fixedString = fixedString.slice(0, fixedString.lastIndexOf('_'));

            query = country + '/' + fixedString;
            options = {
                host: 'api.wunderground.com',
                path: '/api/' + apikey + '/conditions/forecast/q/' + query + '.json',
                timeout: 20
            };

            urlRetrieve(http, options, (status, data) => {
                return callback(data);
            });
        } catch (e) {
            console.log(e);
        }

    }, // End forecast
}


var urlRetrieve = (transport, options, callback) => {
	var dom = domain.create();
	dom.on('error', err => {
		callback(503, err);
	});

	dom.run(() => {
		var req = transport.request(options, res => {
			var buffer = '';
			res.setEncoding('utf-8');
			res.on('data', chunk => {
				buffer += chunk;
			});
			res.on('end', () => {
				callback(res.statusCode, buffer);
			});
		})

		req.end();
	})
};

module.exports = {
	APICall: (msg, type, apikey, callback) => {
		if (type in APIs) {
			APIs[type](msg, apikey, callback);
		}
	},
	retrieve: urlRetrieve
}
