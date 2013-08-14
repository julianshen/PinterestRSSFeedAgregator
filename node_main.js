var spawn = require('child_process').spawn;
var gfeed = require('google-feed-api');
var async = require('async');
var Feed = require('feed');

if(process.argv.length <= 2) {
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
            description:    'This is my personnal feed!',
    	    link:           'http://pinterest.com/' + name,
    	    image:          'https://pinterest.zendesk.com/system/logos/2044/8343/Pinterest_Logo.png',
    	    copyright:      ' ',
            author: {
                 name:       name,
                 email:      name + '@xxx.com',
                 link:       'https://pinterest.com/' + name
            }
        });

        feed_out.category('Pinterest');
        for (var i = 0; i < feeds.length || i < 20; i++) {
            feed_out.item({
                title: feeds[i].title,
                link: feeds[i].link,
                description: feeds[i].content,
                date: new Date(feeds[i].publishedDate)
            });
        }

        var output = feed_out.render();
        console.log(output);
    });
});

getFollowing.on('error ', function(e) {});
