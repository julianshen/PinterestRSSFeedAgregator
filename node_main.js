var spawn = require('child_process').spawn;
var gfeed = require('google-feed-api');
var async = require('async');
var Feed = require('feed');
var gdrive = require('./gdrive');

if (process.argv.length <= 2) {
    console.log('need input a name');
    process.exit();
}

var name = process.argv[2];

var getFollowing = spawn('casperjs', ['getfollowing.js', name]);

var str = '';
var feeds = [];
getFollowing.stdout.on('data', function(data) {
    str += data;
});

getFollowing.stderr.on('data', function(data) {
    console.log('stderr: ' + data);
});

getFollowing.on('close', function(code) {
    var a = JSON.parse(str);
    async.map(a, function(item, callback) {
        var feed_url = 'http://pinterest.com' + item + 'feed.rss';
        var feed = new gfeed.Feed(feed_url);
        feed.includeHistoricalEntries();
        feed.setNumEntries(10);
        feed.load(function(result) {
            if (result == null) {
                callback();
                return;
            }

            var f = result.feed;
            if (!f || !f.entries || !f.entries.length) {
                callback();
                return;
            }
            feeds = feeds.concat(f.entries);
            callback();
            return;
        });
    }, function(err) {
        feeds.sort(function(a, b) {
            var d1 = new Date(a.publishedDate);
            var d2 = new Date(b.publishedDate);

            return d1.getTime() - d2.getTime();
        });

        var feed_out = new Feed({
            title: name + '\'s Pinterest ',
            description: 'This is my personnal feed!',
            link: 'http://pinterest.com/' + name,
            image: 'https://pinterest.zendesk.com/system/logos/2044/8343/Pinterest_Logo.png',
            copyright: ' ',
            author: {
                name: name,
                email: name + '@xxx.com',
                link: 'https://pinterest.com/' + name
            }
        });

        feed_out.category('Pinterest');
        for (var i = 0; i < feeds.length || i < 50; i++) {
            feed_out.item({
                title: feeds[i].title,
                link: feeds[i].link,
                description: feeds[i].content,
                date: new Date(feeds[i].publishedDate)
            });
        }

        var output = feed_out.render();
        console.log(output);

        gdrive.init(function(err) {
            if (err) {
                throw err;
            }

            var rss_file_name = name + ".rss";
            var appConfig = gdrive.getAppConfig();

            var getRSSFolder = function(callback) {
                gdrive.getRoot(function(err, result) {
                    if (err) {
                        throw err;
                    }

                    var rootFolderId = result;
                    var q = 'title=\'MyPinRss\' and \'' + rootFolderId + '\' in parents';

                    gdrive.search(q, function(err, result) {
                        if (err) {
                            if (callback) {
                                callback(err);
                            }
                        }

                        if (result.items.length > 0) {
                            var rssFolderId = result.items[0];

                            if (callback) {
                                callback(null, result.items[0].id);
                            }
                        } else {
                            gdrive.createPublicFolder('MyPinRss', function(err, result) {
                                if (callback) {
                                    callback(null, result);
                                }
                            });
                        }
                    });
                });
            };

            var printWebViewLink = function(fileId) {
                gdrive.getFile(fileId, function(err, result) {
                    if(err) {
                        throw err;
                    }

                    console.log('Your rss is at: ' + result.webViewLink + name + '.rss');
                });
            }

            var createNewFile = function() {
                getRSSFolder(function(err, result) {
                    if (err) {
                        console.log(err);
                        throw err;
                    }

                    var rssFolderId = result;
                    console.log('RSS Folder : ' + rssFolderId);
                    printWebViewLink(rssFolderId);
                    gdrive.createTextFile(rss_file_name, output, {'id':rssFolderId}, function(err, result) {
                        if (err) {
                            console.log(err);
                            throw err;
                        }

                        appConfig.put(rss_file_name + '.id', result.id, function(err, result) {
                            if (err) {
                                console.log(err);
                                throw err;
                            }
                        });

                        gdrive.makePublic(result.id, function(err, result) {
                            if (err) {
                                console.log(err);
                                throw err;
                            }
                        });
                    });
                });
            }

            appConfig.get(rss_file_name + '.id', function(err, result) {
                if (err) {
                    throw err;
                }

                if (result != null) {
                    var fileId = result;
                    gdrive.updateTextFile(fileId, output, function(err, result) {
                        if (err) {
                            if (err.errors[0].reason == 'notFound') {
                                createNewFile();
                            } else {
                                throw err;
                            }
                        }
                    });

                    getRSSFolder(function(err, result) {
                        if(err) {
                            console.log(err);
                            return;
                        }

                        printWebViewLink(result);
                    });
                } else {
                    createNewFile();
                }
            });
        });
    });
});

getFollowing.on('error ', function(e) {});
