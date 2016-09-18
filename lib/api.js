const domain = require('domain');
const http = require('http');
const https = require('https');
const libxmljs = require("libxmljs");

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
    wolfram: (query, apikey, callback) => {
        const options = {
        	host: 'api.wolframalpha.com',
        	path: '/v2/query?input=' + encodeURIComponent(query) + '&appid=' + apikey,
        	timeout: 20
        };

        const findAnswer = pods => {
            for (var i = 0; i < pods.length; i++) {
        		if (pods[i]['primary']) {
                    callback(pods[i]['subpods'][0]['value']);

                    return;
                }
        	}

        	// We couldn't find one, pick the next thing after
        	// the input pod with data
        	for (var i = 1; i < pods.length; i++) {
        		if (pods[i]['subpods'][0]['value']) {
                    callback(pods[i]['subpods'][0]['value']);

        			return;
        		} else if (pods[i]['subpods'][0]['text']) {
                    callback(pods[i]['subpods'][0]['text']);

        			return;
        		}
        	}

        	// We couldn't find anything
            callback('WolframAlpha query failed');

        	return;
        };

        const getPods = xml => {
            const root = xml.root();

            if (root.attr('error').value() !== 'false') {
                callback(root.get('//error/msg').text());

            	return;
            }

            const pods = root.find('pod').map(pod => {

            	// The name of the pod
            	const title = pod.attr('title').value();

            	// Retrive the subpods
            	const subpods = pod.find('subpod').map(node => {
            		return {
            			title: node.attr('title').value(),
            			value: node.get('plaintext').text()
            		};
            	});

            	// Is this the primary pod?
            	const primary = (pod.attr('primary') && pod.attr('primary').value()) == 'true';

            	return {
            		title: title,
            		subpods: subpods,
            		primary: primary
            	};
            });

            return pods;
        };

        urlRetrieve(http, options, (status, data) => {
            var xmlDoc = {};

            // Sometimes WolframAlpha sends you malformed XML
            try {
            	xmlDoc = libxmljs.parseXml(data)
            } catch (e) {
            	callback('Error parsing XML');

            	return;
            }

            return findAnswer(getPods(xmlDoc));
        });
    },
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
