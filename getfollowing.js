var casper = require('casper').create();

var name;
if(casper.cli.args.length <= 0) {
    casper.echo('{error:"1", msg:"need input a name"}').exit();
}

name = casper.cli.args[0];

casper.start('http://pinterest.com/' + name + '/following', function() {
});
casper.viewport(1280,1024);

var numFollowing = 0;

casper.then(function() {
    numFollowing = this.getElementAttribute('meta[name="pinterestapp:following"]', 'content');
});

casper.waitFor(function check() {
    return this.evaluate(function(nf) {
        window.scrollTo(0,document.body.scrollHeight);

        var numfollow = document.querySelectorAll('a.userWrapper').length;
        console.log(numfollow);

        if(numfollow < nf) {
           return false;
        }
        return true;
    }, numFollowing);
}, function then() {
    require('utils').dump(this.getElementsAttribute('a.userWrapper', 'href'));
});


casper.run();
