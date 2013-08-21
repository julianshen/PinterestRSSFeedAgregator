var googleapis = require('googleapis');
var OAuth2Client = googleapis.OAuth2Client;
var config = require('./gclient_config');
var gclient;
var oauth2Client;

function callCallback_(callback, err, result) {
    if (callback) {
        callback(err, result);
    }
}

function init(callback) {
    //load token 
    var fs = require('fs');
    fs.readFile(config.GOOGLE_TOKEN_FILE, function(err, data) {
        if (err) {
            callCallback_(callback, err);
            return;
        }

        var tokens = JSON.parse(data);
        oauth2Client = new OAuth2Client(config.CLIENT_ID, config.CLIENT_SECRET, config.REDIRECT_URL);
        oauth2Client.credentials = tokens;
        googleapis.withAuthClient(oauth2Client);

        googleapis.discover('drive', 'v2').execute(function(error, client) {
            if (error) {
                callCallback_(callback, err);
                return;
            }
            gclient = client;
            callCallback_(callback);
        });
    });
}

function test() {
    var body = {
        title: 'Test',
        mimeType: 'text/plain'
    };
    gclient
        .drive.files.insert(body)
        .withMedia('text/plain', 'Hello World').execute(function(err, result) {
            console.log('error:', err, 'inserted:', result.id)
        });
}

function createPublicFolder(name, callback) {
    var body = {
        'title': name,
        'mimeType': "application/vnd.google-apps.folder"
    };

    gclient.drive.files.insert(body).execute(function(err, resp) {
        if (err) {
            callCallback_(callback, err);
            return;
        }

        var permissionBody = {
            'value': '',
            'type': 'anyone',
            'role': 'reader'
        };
        var fileId = resp.id;
        var permissionRequest = gclient.drive.permissions.insert({
            'fileId': fileId
        }, permissionBody);
        permissionRequest.execute(function(err, resp) {
            if (err) {
                callCallback_(callback, err);
                return;
            }

            callCallback_(callback, null, fileId);
        });
    });
}

function searchFile(query, callback) {
    var request = gclient.drive.files.list({
        'q': query
    });
    request.execute(callback);
}

function getAppFolder(callback) {
    var request = gclient.drive.files.get({
        'fileId': 'appdata'
    });
    request.execute(callback);
}

function getRootFolder(callback) {
    var request = gclient.drive.about.get();

    request.execute(function(err, result) {
        if (err) {
            callCallback_(callback, err);
            return;
        }
        callCallback_(callback, null, result.rootFolderId);
    });
}

function findFileInFolder(fileName, folderId, callback) {
    var request = gclient.drive.children.list({
        'folderId': folderId,
        'q': 'title=\'' + fileName + '\''
    });

    request.execute(function(err, result) {
        if (err) {
            callCallback_(callback, err);
            return;
        }

        callCallback_(callback, null, result.items);
    });
}

function findAppFile(fileName, callback) {
    findFileInFolder(fileName, 'appdata', callback);
}

function createTextFileWithValue(fileName, value, parent, callback) {
    var body = {
        'title': fileName,
        'mimeType': 'text/plain'
    };

    if (parent != null) {
        body.parents = [parent];
    }

    var request = gclient.drive.files.insert(body).withMedia('text/plain', value);
    request.execute(callback);
}

function createAppFileWithTextValue(fileName, value, callback) {
    createTextFileWithValue(fileName, value, {
        'id': 'appdata'
    }, callback);
}

function updateTextFileWithValue(fileId, value, callback) {
    var request = gclient.drive.files.update({
        'fileId': fileId
    }).withMedia('text/plain', value);
    request.execute(callback);
}

function makePublic(fileId, callback) {
    var permissionBody = {
        'value': '',
        'type': 'anyone',
        'role': 'reader'
    };

    var permissionRequest = gclient.drive.permissions.insert({
        'fileId': fileId
    }, permissionBody);

    permissionRequest.execute(function(err, resp) {
        if (err) {
            callCallback_(callback, err);
            return;
        }

        callCallback_(callback, null, fileId);
    });
}

function getFile(fileId, callback) {
    gclient.drive.files.get({
        'fileId': fileId
    }).execute(callback);
}

function AppConfig() {
    this.config_file_prefix = 'config:';
};

AppConfig.prototype.put = function(key, val, callback) {
    var fileName = this.config_file_prefix + key;

    findAppFile(fileName, function(err, result) {
        if (err) {
            callCallback_(callback, err);
            return;
        }

        if (result.length == 0) {
            //create new file
            createAppFileWithTextValue(fileName, val, function(err, result) {
                callCallback_(callback, err);
            });
        } else {
            //use first one (lazy)
            var fileId = result[0].id;

            updateTextFileWithValue(fileId, val, function(err, result) {
                callCallback_(callback, err);
            });
        }
    });
};

AppConfig.prototype.get = function(key, callback) {
    var fileName = this.config_file_prefix + key;

    findAppFile(fileName, function(err, result) {
        if (err) {
            callCallback_(callback, err);
            return;
        }

        if (result.length == 0) {
            callCallback_(callback); //val == null;
            return;
        }

        var fileId = result[0].id;
        gclient.drive.files.get({
            'fileId': fileId
        }).execute(function(err, result) {
            oauth2Client.request({
                'uri': result.downloadUrl
            }, callback);
        });
    });
};

function getAppConfig() {
    return new AppConfig();
}

module.exports = {
    'init': init,
    'test': test,
    'createPublicFolder': createPublicFolder,
    'search': searchFile,
    'getRoot': getRootFolder,
    'getAppFolder': getAppFolder,
    'findAppFile': findAppFile,
    'getAppConfig': getAppConfig,
    'createTextFile': createTextFileWithValue,
    'updateTextFile': updateTextFileWithValue,
    'makePublic': makePublic,
    'getFile': getFile
};
