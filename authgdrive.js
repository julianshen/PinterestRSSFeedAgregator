var googleapis = require('googleapis');
var OAuth2Client = googleapis.OAuth2Client;
var fs = require('fs');
var config = require('./gclient_config');

function getAccessToken(oauth2Client, callback) {
    // generate consent page url
    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata',
        approval_prompt: 'force'
    });

    console.log('Visit the url: ', url);

    var http = require('http');
    var server = http.createServer(function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.end('OK\n');

        var query = require('url').parse(req.url, true).query;
        if (query.code != null) {
            // request access token
            oauth2Client.getToken(query.code, function(err, tokens) {
                oauth2Client.credentials = tokens;
                console.log(tokens);
                callback(tokens);
            });
        }
    });
    server.listen(1888, '127.0.0.1');
}

var oauth2Client =
    new OAuth2Client(config.CLIENT_ID, config.CLIENT_SECRET, config.REDIRECT_URL);

// retrieve an access token
getAccessToken(oauth2Client, function(tokens) {
    console.log('Saving to ' + config.GOOGLE_TOKEN_FILE);

    fs.writeFile(config.GOOGLE_TOKEN_FILE, JSON.stringify(tokens), function(err) {
        if (err) {
            throw err;
        }
        console.log('Token saved');
        process.exit();
    });
});
