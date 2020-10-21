// ZIM - http://zimjs.com - Code Creativity!
// JavaScript Canvas Framework for General Interactive Media
// free to use - donations welcome of course! http://zimjs.com/donate

// ZIM PIZZAZZ 2 - see http://zimjs.com/code#libraries for examples

// ~~~~~~~~~~~~~~~~~~~~~~~~
// DESCRIPTION - coded in 2016 (c) Inventor Dan Zen http://danzen.com
// Pizzazz 2 is a helper module for ZIM that adds a little design love!
// SEE also Pizzazz for background shapes

// VERSION 2 - Icons for Labels, Buttons and Panes
// See the ZIM Bit on Pizzazz for an example: http://zimjs.com/bits/view/icons.html

// import this js file in the top of your code below where you import createjs
// you can get a custom zim.Container with icon and backing shape
// by using pizzazz.makeIcon(type, color, backingColor, backingShape, size)
// and then pass this into the backing parameter in zim.Label, zim.Button or zim.Pane
// and rollBacking parameter in zim.Button
// pizzazz.listIcons() will list your icon options in the console

// ~~~~~~~~~~~~~~~~~~~~~~~~
// DOCS

/*--
pizzazz.makeIcon = function(type, color, scale, multi, multiAlpha, multiScale, multiX, multiY, skewX, skewY, backing)

A function stored on pizzazz namespace
PIZZAZZ provides a quick way to get access to some common icons created in Adobe Animate
You can add your own here or make your own library in a similar way!
To see the icons available use:
pizzazz.listIcons();

EXAMPLE
var icon = pizzazz.makeIcon("home", white, 250).pos(40,40,true);

// Example - pass the icon into the Button class as the icon parameter
// Optionally provide a second shape for the rollIcon, etc. of the Button

var info = new Button({
	width:50,
	height:50,
	color:frame.blue, // or "red", "#666" etc.
	rollColor:frame.pink,
	corner:0,
	label:"",
	icon:pizzazz.makeIcon("info", "white")
})
	.pos(stageW - 100, 50)
info.on("click", function(){zgo("http://zimjs.com/bits/view/icons.html")});

END EXAMPLE

PARAMETERS supports DUO - parameters or single object with properties below
type (default "cloud") 0 the shape name - see list below
color (default "black") a CSS color for the shape
scale (default 1) the scale of the icon
multi (default 1) how many icons to show
multiAlpha (default .5) alpha for other icons
multiScale (default .3) scale for each subsequent icons
multiX (default 0) x shift for each subsequent icons
multiY (default 0) y shift for each subsequent icons
skewX (default 0) horizontal skew of icon
skewY (default 0) vertical skew of icon

RETURNS:
a zim.Shape
*/


var pizzazz = function(pizzazz) {
	pizzazz.icons = {
		play:[[1,1],[-4,0],"AiJieIETCeIkTCfg", new createjs.Rectangle(-13.8,-16,27.7,32)],
		stop:[[1,1],[0,0],"AhuBvIAAjdIDdAAIAADdg", new createjs.Rectangle(-11.2,-11.2,22.4,22.4)],
		pause:[[1,1],[0,0],"AAhCLIAAkVIBXAAIAAEVgAh3CLIAAkVIBXAAIAAEVg", new createjs.Rectangle(-12,-13.9,24.1,27.9)],
		restart:[[1,1],[-1,0],"AiFCLIAAkVIBXAAIAAEVgAgiAAICoiHIAAEQg", new createjs.Rectangle(-13.4,-13.9,26.9,27.9)],
		rewind:[[1,1],[3,0],"AAGAAICqiIIAAERgAivAAICqiIIAAERg", new createjs.Rectangle(-17.6,-13.7,35.3,27.5)],
		fastforward:[[1,1],[-3,0],"AAGiIICqCIIiqCJgAiviIICqCIIiqCJg", new createjs.Rectangle(-17.6,-13.7,35.3,27.5)],
		sound:[[1,1],[1,0],"AgXBTIhnAAIAAijIBmAAICXhbIAAFXg", new createjs.Rectangle(-12.7,-17.3,25.5,34.6)],
		mute:[[1,1],[1,0],"AgXBTIhnAAIAAijIBmAAICXhbIAAFXgABXA+IAUgVIgtgqIAtgtIgUgVIgtAsIgrgsIgVAVIArAtIgsArIAWAUIArgtg", new createjs.Rectangle(-12.7,-17.3,25.5,34.6)],
		close:[[1,1],[0,0],"AAAA4Ih6B8Ig5g4IB8h8Ih7h6IA4g5IB6B8IB7h8IA5A5Ih8B6IB8B7Ig5A5g", new createjs.Rectangle(-18,-18,36.1,36)],
		settings:[[1,1],[0,0],"AgoDhIAAg2QgbgHgWgOIgnAmIg8g7IAngnQgOgXgGgZIg3AAIAAhSIA2AAQAGgaAPgXIgngnIA7g8IAnAnQAXgPAbgGIAAg2IBSAAIAAA2QAaAGAXAPIAmgnIA8A8IgmAnQAOAWAGAbIA2gBIAABTIg2AAQgHAagOAXIAmAmIg7A7IgmglQgXANgaAHIAAA2gAg8g7QgYAYAAAjQAAAjAYAZQAaAYAiAAQAiAAAZgYQAZgZAAgjQAAgjgZgYQgZgZgiAAQgiAAgaAZg", new createjs.Rectangle(-22.5,-22.5,45.2,45.1)],
		menu:[[1,1],[0,0],"AixClIAAhGIFjAAIAABGgAixAiIAAhEIFjAAIAABEgAixheIAAhGIFjAAIAABGg", new createjs.Rectangle(-17.8,-16.6,35.7,33.2)],
		maximize:[[1,1],[0,0],"AA3DGIAAgyIBeAAIAAhdIAyAAIAACPgAjGDGIAAiPIAyAAIAABdIBiAAIAAAygAhMBOIAAicICcAAIAACcgACVgyIAAhhIheAAIAAgyICQAAIAACTgAjGgyIAAiTICUAAIAAAyIhiAAIAABhg", new createjs.Rectangle(-19.9,-19.9,39.8,39.8)],
		arrow:[[1,1],[-3,0],"AhFBdIiWAAIAAi4ICWAAIAAh7IEhDWIkhDXg", new createjs.Rectangle(-22,-21.5,44.1,43)],
		arrowthin:[[1,1],[-1,0],"AgKAqIi9AAIAAhSIC9AAIAAh0IDSCcIjSCdg", new createjs.Rectangle(-20,-15.7,40.1,31.5)],
		arrowstick:[[1,1],[-1,0],"AhBCIIBZhbIjWAAIAAhVIDaAAIhdhfIA9g+IDDDFIAAAAIAAAAIjDDGg", new createjs.Rectangle(-19.2,-19.8,38.4,39.7)],
		arrowhollow:[[1,1],[-2,0],"Ag/BhIivAAIAAjBICvAAIAAiDIEuDjIkuDkgAjGA4ICvAAIAABdIDDiVIjDiTIAABcIivAAg", new createjs.Rectangle(-23.9,-22.9,47.9,45.8)],
		arrowline:[[1,1],[2,0],"AhQAqIiOAAIAAhSICOAAIAAh0IDSCcIjSCdgACICLIAAkVIBXAAIAAEVg",new createjs.Rectangle(-22.3,-15.7,44.8,31.5)],
		rotate:[[1,1],[0,2],"AhfC7Qg+gogRhJIAAAAQgQhJAog9QAkg3A9gSQAJgFAJgBQAMgDAMAAIACAjIAAhrICcB0IicB0IAAhaIgOACIAAAAIgIADQgmALgWAiQgYAkAJAtIAAgBQAKAtAnAZQAmAYAqgKIABAAQAsgJAYgnIABgBQAGgJAEgJIAAAAQAGgRABgRIBGADQgBAcgLAcQgGAQgKAPQgoBAhKAQQgUAEgSAAQgyAAgtgcg", new createjs.Rectangle(-18,-21.5,36.1,43.2)],
		heart:[[1,1],[0,-3],"AgCC2QgRgTgogmQgmgjgSgVQgcgfgPgZQgSgcgIglQgIgnALggQAJgdAagPQAfgVArAKQAmAIAhAdQAggdAmgJQAqgKAfAWQAhAXAJAhQAKAhgPAmQgNAigPAXQgPAZgZAcQgSAVgmAjQgpAlgPATIAAABIgBAAg", new createjs.Rectangle(-18.9,-18.3,37.8,36.7)],
		marker:[[1,1],[0,-1],"AAADtIAAAAIAAgBQhdiJgcgyQgthMAEhDQAEhDAxgnQAugkA/AAIAAAAQBAAAAuAkQAyAnADBDQAEBDgsBMQgdAyheCJIAAABIAAAAgAg6iUQgZAZAAAkQAAAkAZAZQAaAaAiAAQAkAAAYgaQAagZAAgkQAAgkgagZQgYgZgkAAQgiAAgaAZg", new createjs.Rectangle(-16.4,-23.7,32.8,47.6)],
		info:[[.7,.7],[0,1],"Ag/DRIAAjbIB/AAIAADbgAg0hQQgWgWABgfQgBgfAWgWQAXgWAdAAQAeAAAXAWQAWAWgBAfQABAfgWAWQgXAWgeAAQgdAAgXgWg", new createjs.Rectangle(-7.5,-20.9,15,42)],
		home:[[1,1],[0,1],"AAtDPIAAh4QgCgQgLgMQgNgNgTAAQgRAAgNANQgMAMgBAQIAAAAIAAB4Ih3AAIAAjPIg+AAIDgjOIDhDOIg/AAIAADPg", new createjs.Rectangle(-22.5,-20.7,45.2,41.6)],
		edit:[[1,1],[0,0],"AigA2IBqBqIiOAmgAiPAmICxiwIBoBoIiwCxgAAzibIApgqIBpBpIgqApg", new createjs.Rectangle(-19.7,-19.8,39.5,39.7)],
		magnify:[[1,1],[0,0],"AAnBcQgnAagxAAIgBAAQhDgBgvgwQgxgwgBhCIAAAAQAAhFAwgwQAxgwBEAAQBDgBAwAxQAwAwAABFQAAAtgVAiIB6B5Ig4A4gAh0hwQgcAbAAAoQAAAnAcAZIABAAQAcAcAmABIABAAQAnAAAZgcIABAAQAbgaAAgnQAAgogbgbIgBgBQgZgcgoABIAAAAQgoAAgbAcg", new createjs.Rectangle(-21.5,-21.1,43.1,42.3)],

	}

	pizzazz.makeIcon = function(type, color, scale, multi, multiAlpha, multiScale, multiX, multiY, skewX, skewY, backing) {
		var duo; if (duo = zob(pizzazz.makeIcon, arguments)) return duo;
		if (zot(type)) type = "play";
		type = type.toLowerCase();
		if (zot(color)) color = "black";
		if (zot(scale)) scale = 1;
		if (zot(multi)) multi = 1; // one icon
		if (zot(multiAlpha)) multiAlpha = .5; // for second icon
		if (zot(multiScale)) multiScale = .3; // for each subsequent icons
		if (zot(multiX)) multiX = 0; // for each subsequent icons
		if (zot(multiY)) multiY = 0; // for each subsequent icons
		if (zot(skewX)) skewX = 0;
		if (zot(skewY)) skewY = 0;
		var data = pizzazz.icons[type];
		if (zot(data)) data = pizzazz.icons["play"];
		var sX = data[0][0]; // scale adjust - not used for icons
		var sY = data[0][1];
		var rX = data[1][0]; // registration point adjust
		var rY = data[1][1];
		var rect = data[3];

		var shape = new zim.Shape();
		shape.setBounds(rect.x, rect.y, rect.width, rect.height);
		shape.regX = rX;
		shape.regY = rY;
		shape.skewX = skewX;
		shape.skewY = skewY;
		shape.graphics.f(color).p(data[2]);
		shape.scaleX = scale;
		shape.scaleY = scale;

		var container = new zim.Container();
		container.type = type;
		container.shape = shape; // original icon shape
		container.addChild(shape);
		if (multi > 1) {
			var copy;
			for (var i=1; i<multi; i++) {
				copy = shape.clone();
				copy.scaleX = copy.scaleY = scale*(1+i*multiScale);
				copy.alpha = multiAlpha / i;
				copy.x = multiX * i;
				copy.y = multiY * i;
				container.addChild(copy);
			}
		}
		if (!zot(backing)) {
			backing.centerReg();
			container.addChildAt(backing);
		}
		return container;
	}

	pizzazz.listIcons = function() {
		for (var i in pizzazz.icons) {
			zog(i);
		}
	}
	return pizzazz;
}(pizzazz || {});
