//
/**
sprintf() for JavaScript 0.7-beta1
http://www.diveintojavascript.com/projects/javascript-sprintf

Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of sprintf() for JavaScript nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Changelog:
2010.09.06 - 0.7-beta1
  - features: vsprintf, support for named placeholders
  - enhancements: format cache, reduced global namespace pollution

2010.05.22 - 0.6:
 - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 Note:
 Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/)
 who warned me about a bug in 0.5, I discovered that the last update was
 a regress. I appologize for that.

2010.05.09 - 0.5:
 - bug fix: 0 is now preceeded with a + sign
 - bug fix: the sign was not at the right position on padded results (Kamal Abdali)
 - switched from GPL to BSD license

2007.10.21 - 0.4:
 - unit test and patch (David Baird)

2007.09.17 - 0.3:
 - bug fix: no longer throws exception on empty paramenters (Hans Pufal)

2007.09.11 - 0.2:
 - feature: added argument swapping

2007.04.03 - 0.1:
 - initial release
**/

var sprintf = (function() {
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}
	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	var str_format = function() {
		if (!str_format.cache.hasOwnProperty(arguments[0])) {
			str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
		}
		return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
	};

	str_format.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	str_format.cache = {};

	str_format.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw('[sprintf] huh?');
							}
						}
					}
					else {
						throw('[sprintf] huh?');
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw('[sprintf] huh?');
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	return str_format;
})();

var vsprintf = function(fmt, argv) {
	argv.unshift(fmt);
	return sprintf.apply(null, argv);
};
//  TangleKit.js
//  Tangle 0.1.0
//
//  Created by Bret Victor on 6/10/11.
//  (c) 2011 Bret Victor.  MIT open-source license.
//


(function () {


//----------------------------------------------------------
//
//  TKIf
//
//  Shows the element if value is true (non-zero), hides if false.
//
//  Attributes:  data-invert (optional):  show if false instead.

Tangle.classes.TKIf = {

    initialize: function (element, options, tangle, variable) {
        this.isInverted = !!options.invert;
    },

    update: function (element, value) {
        if (this.isInverted) { value = !value; }
        element.style.display = !value ? "none" : "inline";   // todo, block or inline?
    }
};


//----------------------------------------------------------
//
//  TKSwitch
//
//  Shows the element's nth child if value is n.
//
//  False or true values will show the first or second child respectively.

Tangle.classes.TKSwitch = {

    update: function (element, value) {
        element.getChildren().each( function (child, index) {
            child.style.display = (index != value) ? "none" : "inline";
        });
    }
};


//----------------------------------------------------------
//
//  TKSwitchPositiveNegative
//
//  Shows the element's first child if value is positive or zero.
//  Shows the element's second child if value is negative.

Tangle.classes.TKSwitchPositiveNegative = {

    update: function (element, value) {
        Tangle.classes.TKSwitch.update(element, value < 0);
    }
};


//----------------------------------------------------------
//
//  TKToggle
//
//  Click to toggle value between 0 and 1.

Tangle.classes.TKToggle = {

    initialize: function (element, options, tangle, variable) {
        element.addEvent("click", function (event) {
            var isActive = tangle.getValue(variable);
            tangle.setValue(variable, isActive ? 0 : 1);
        });
    }
};


//----------------------------------------------------------
//
//  TKNumberField
//
//  An input box where a number can be typed in.
//
//  Attributes:  data-size (optional): width of the box in characters

Tangle.classes.TKNumberField = {

    initialize: function (element, options, tangle, variable) {
        this.input = new Element("input", {
    		type: "text",
    		"class":"TKNumberFieldInput",
    		size: options.size || 6
        }).inject(element, "top");

        var inputChanged = (function () {
            var value = this.getValue();
            tangle.setValue(variable, value);
        }).bind(this);

        this.input.addEvent("keyup",  inputChanged);
        this.input.addEvent("blur",   inputChanged);
        this.input.addEvent("change", inputChanged);
	},

	getValue: function () {
        var value = parseFloat(this.input.get("value"));
        return isNaN(value) ? 0 : value;
	},

	update: function (element, value) {
	    var currentValue = this.getValue();
	    if (value !== currentValue) { this.input.set("value", "" + value); }
	}
};


//----------------------------------------------------------
//
//  TKAdjustableNumber
//
//  Drag a number to adjust.
//
//  Attributes:  data-min (optional): minimum value
//               data-max (optional): maximum value
//               data-step (optional): granularity of adjustment (can be fractional)

var isAnyAdjustableNumberDragging = false;  // hack for dragging one value over another one

Tangle.classes.TKAdjustableNumber = {

    initialize: function (element, options, tangle, variable) {
        this.element = element;
        this.tangle = tangle;
        this.variable = variable;

        this.min = (options.min !== undefined) ? parseFloat(options.min) : 1;
        this.max = (options.max !== undefined) ? parseFloat(options.max) : 10;
        this.step = (options.step !== undefined) ? parseFloat(options.step) : 1;

        this.initializeHover();
        this.initializeHelp();
        this.initializeDrag();
    },


    // hover

    initializeHover: function () {
        this.isHovering = false;
        this.element.addEvent("mouseenter", (function () { this.isHovering = true;  this.updateRolloverEffects(); }).bind(this));
        this.element.addEvent("mouseleave", (function () { this.isHovering = false; this.updateRolloverEffects(); }).bind(this));
    },

    updateRolloverEffects: function () {
        this.updateStyle();
        this.updateCursor();
        this.updateHelp();
    },

    isActive: function () {
        return this.isDragging || (this.isHovering && !isAnyAdjustableNumberDragging);
    },

    updateStyle: function () {
        if (this.isDragging) { this.element.addClass("TKAdjustableNumberDown"); }
        else { this.element.removeClass("TKAdjustableNumberDown"); }

        if (!this.isDragging && this.isActive()) { this.element.addClass("TKAdjustableNumberHover"); }
        else { this.element.removeClass("TKAdjustableNumberHover"); }
    },

    updateCursor: function () {
        var body = document.getElement("body");
        if (this.isActive()) { body.addClass("TKCursorDragHorizontal"); }
        else { body.removeClass("TKCursorDragHorizontal"); }
    },


    // help

    initializeHelp: function () {
        this.helpElement = (new Element("div", { "class": "TKAdjustableNumberHelp" })).inject(this.element, "top");
        this.helpElement.setStyle("display", "none");
        // TODO -ac This could be changed to 
        this.helpElement.set("text", "drag");
    },

    updateHelp: function () {
        var size = this.element.getSize();
        var top = -size.y + 7;
        var left = Math.round(0.5 * (size.x - 20));
        var display = (this.isHovering && !isAnyAdjustableNumberDragging) ? "block" : "none";
        this.helpElement.setStyles({ left:left, top:top, display:display });
    },


    // drag

    initializeDrag: function () {
        this.isDragging = false;
        new BVTouchable(this.element, this);
    },

    touchDidGoDown: function (touches) {
        this.valueAtMouseDown = this.tangle.getValue(this.variable);
        this.isDragging = true;
        isAnyAdjustableNumberDragging = true;
        this.updateRolloverEffects();
        this.updateStyle();
    },

    touchDidMove: function (touches) {
        var value = this.valueAtMouseDown + touches.translation.x / 5 * this.step;
        value = ((value / this.step).round() * this.step).limit(this.min, this.max);
        this.tangle.setValue(this.variable, value);
        this.updateHelp();
    },

    touchDidGoUp: function (touches) {
        this.helpElement.setStyle("display", "none");
        this.isDragging = false;
        isAnyAdjustableNumberDragging = false;
        this.updateRolloverEffects();
        this.updateStyle();
    }
};




//----------------------------------------------------------
//
//  formats
//
//  Most of these are left over from older versions of Tangle,
//  before parameters and printf were available.  They should
//  be redesigned.
//

function formatValueWithPrecision (value,precision) {
    if (Math.abs(value) >= 100) { precision--; }
    if (Math.abs(value) >= 10) { precision--; }
    return "" + value.round(Math.max(precision,0));
}

Tangle.formats.p3 = function (value) {
    return formatValueWithPrecision(value,3);
};

Tangle.formats.neg_p3 = function (value) {
    return formatValueWithPrecision(-value,3);
};

Tangle.formats.p2 = function (value) {
    return formatValueWithPrecision(value,2);
};

Tangle.formats.e6 = function (value) {
    return "" + (value * 1e-6).round();
};

Tangle.formats.abs_e6 = function (value) {
    return "" + (Math.abs(value) * 1e-6).round();
};

Tangle.formats.freq = function (value) {
    if (value < 100) { return "" + value.round(1) + " Hz"; }
    if (value < 1000) { return "" + value.round(0) + " Hz"; }
    return "" + (value / 1000).round(2) + " KHz";
};

Tangle.formats.dollars = function (value) {
    return "$" + value.round(0);
};

Tangle.formats.free = function (value) {
    return value ? ("$" + value.round(0)) : "free";
};

Tangle.formats.percent = function (value) {
    return "" + (100 * value).round(0) + "%";
};



//----------------------------------------------------------

})();

