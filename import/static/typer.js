//slightly modified from https://github.com/rachstock/typing-animation

function Typing() {
}

Typing.prototype = {
	lines: '',
	container: null,
	insertPoint: null,
	para: null,

	beginTyping: function (lines, parent) {
		this.lines = lines;

		// Create the typer div
		this.container = $(parent);//$(document.createElement('div'));
//		this.container.attr('id', 'typer');
//		parent.append(this.container);

		this.container.empty();
		// Create the 'insertion point'
		this.insertPoint = $(document.createElement('span'));
		this.insertPoint.attr('id', 'insert-point');

		// Create our paragraph tags
		for (var i = 0, l = lines.length; i < l; i++) {
			var p = $(document.createElement('p'));
			p.attr('class', 'typer');
			p.html('<span class="typing"></span>');
			this.container.append(p);
		}

//		this.insertPoint.css('height', fontSize);

		// Select first paragraph, add the insertion point, start typing
		var p = this.container.find('p:first');
		p.append(this.insertPoint);
		var caller = this;
		setTimeout(function () {
			caller.typeLine(p, 0);
		}, 2000);
	},

	typeLine: function (p, index) {
		console.log('type line ' + index);
		var span = p.find('span.typing');
		var line = this.lines[index];
		// Begin typing line
		this.typeLetter(p, index, 0, span, line);
	},

	typeLetter: function (p, lineIndex, letterIndex, span, line) {
		// add the letter
		span.append(line[letterIndex]);
		var caller = this;
		if (letterIndex + 1 < line.length) {
			// Add another letter (after a delay)
			setTimeout(function () {
					caller.typeLetter(p, lineIndex, letterIndex + 1, span, line);
				}, Math.floor((Math.random() * 100) + 50)
			);
		} else {
			// We've reached the end of the line, callback after a short delay
			setTimeout(function () {
				caller.finishLine(p, lineIndex)
			}, 500);
		}
	},

	finishLine: function (p, index) {
		// When we've finished a line of type, start a new one
		if (index + 1 < this.lines.length) {
			p = p.next();
			console.log(p);
			this.insertPoint.remove().appendTo(p);
			this.typeLine(p, index + 1);
		} else {
			this.insertPoint.remove();
		}
	}
};