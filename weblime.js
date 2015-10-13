/*
	 ___________________________________________________________________________________
	|
	| LICENSE
	|
	|	The MIT License (MIT)
	|
	|	Copyright (c) 2014 Hexagon@GitHub
	|
	|	Permission is hereby granted, free of charge, to any person obtaining a copy
	|	of this software and associated documentation files (the "Software"), to deal
	|	in the Software without restriction, including without limitation the rights
	|	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	|	copies of the Software, and to permit persons to whom the Software is
	|	furnished to do so, subject to the following conditions:
	|
	|	The above copyright notice and this permission notice shall be included in
	|	all copies or substantial portions of the Software.
	|
	|	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	|	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	|	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	|	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	|	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	|	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	|	THE SOFTWARE.
	|___________________________________________________________________________________
	 ___________________________________________________________________________________
	|
	| README
	|
	| weblime - A highly experimental canvas/html5 based text editor in an early
	|           stage of developent
	|___________________________________________________________________________________
	 ___________________________________________________________________________________
	|
	| TODO
	|
	|   * Modifier chars should not be inserted/completed by enter, backspace, tab etc
	|   * CTRL+Backspace should remove words
	|   * Syntax highlighting
	|   * Fix zoom-blurryness
	|__________________________________________________________________________________*/

(function (self, factory) {
    if (typeof define === 'function' && define.amd) {
    	// AMD. Register as an anonymous module.
        define([], factory());
    } else if (typeof exports === 'object') { // Node
        module.exports = factory;
    } else {
    	// Attaches to the current context.
        window.weblime = factory;
  	}
}(this, (weblime = function () {

	return function (dest_elm) {

		var dest = null,
			c = null,
			canvas = null,
			ctx = null,

			ctx_width = 0,
			ctx_height = 0,

			buffer = new Array(),

			cur_row = 0,
			mo_idx = 0,
			cur_col = 0,
			cur_scroll = 0,

			font = "9pt 'Consolas', 'Courier New', Courier, Monospace",
			ln_height = 16,
			ln_width = 0,
			chr_width = 0;

		buffer[0] = '';

		function load_data(data,title) {

			spl = data.split('\r\n');
			spl = data.split('\r');
			spl = data.split('\n');

			buffer = [];

			for(var i = 0;i<spl.length;i++) {
				buffer[i] = spl[i];
			}

			cur_row = 0;
			cur_col = 0;
			cur_scroll = 0;

			window_redraw();			

		}

		function create(destination) {
			
			dest = document.getElementById(destination);
			canvas = document.createElement('canvas');
			canvas.tabIndex = 1; // Fix to allow canvas to receive key events
			dest.appendChild(canvas);
			ctx = canvas.getContext('2d');

			ctx.font = font;
			chr_width = ctx.measureText("a").width;

			window_resize();

			// Event handlers
			dest.addEventListener('resize', window_resize);
			canvas.addEventListener('keypress', function(e) { 	if(e.charCode) keypress_handler(e);  						});
			canvas.addEventListener('keydown', function(e) { 	if(e.keyCode&&e.keyCode!=e.charCode) keypress_handler(e);	}); // Keypress does not capture backspace
			canvas.addEventListener('click', function(e) {	click_handler(e); 												});
			canvas.addEventListener('mousemove', function(e) {	move_handler(e); 											});

			return this;

		}

		function check_scroll() {
			if(cur_row*ln_height-cur_scroll*ln_height+ln_height*2>ctx_height) {
				var add = Math.ceil((cur_row*ln_height-cur_scroll*ln_height+ln_height*2-ctx_height)/ln_height)
				cur_scroll += add;
				
			}
			if(cur_row*ln_height-cur_scroll*ln_height-ln_height<-ln_height) {
				var add = Math.ceil((cur_row*ln_height-cur_scroll*ln_height)/ln_height);
				cur_scroll += add;
				if( cur_scroll <0 ) cur_scroll = 0;
			}
		}

		function click_handler(e) {

			// Set row
			sel_row = Math.ceil(e.clientY/ln_height)+cur_scroll;
			if(sel_row<=buffer.length) {
				cur_row=sel_row-1;
			} else {
				cur_row=buffer.length-1;
			}

			// Set col
			sel_col = Math.ceil((e.clientX-ln_width-10)/chr_width);
			if(sel_col<=buffer[cur_row].length&&sel_col>0) {
				cur_col=sel_col-1;
			} else {
				cur_col=buffer[cur_row].length;
			}

			window_redraw();
		}

		function move_handler(e) {
			mo_idx = Math.ceil(e.clientY/ln_height);
			if(mo_idx+cur_scroll>buffer.length)mo_idx=buffer.length-cur_scroll;

			window_redraw();
		}

		function syntax_highlight(lang,buf,buf_idx,chr_idx) {
			var override = false;
			if(typeof rules !== 'undefined') { 
				var rule = rules[lang];
				var buffer_text = buf[buf_idx];
				for(var i=0;i<rule.length;i++) {
					var cur_rule = rule[i];
					if( !override ) {
						if(cur_rule.start === buffer_text.substr(chr_idx,cur_rule.start.length)) {
							if( !override ) {
								if(cur_rule.override_all) override = true;
								return(cur_rule.color);
							}
						}
						if(chr_idx-cur_rule.end.length>=0 && cur_rule.end === buffer_text.substr(chr_idx-cur_rule.end.length,cur_rule.end.length)) {
							if( !override ) {
								if(cur_rule.override_all) override = true;
								return("rgb(220,220,220)");
							}
						}
					}
				}
			}
		}

		function window_redraw() {

			// Redraw bg
			ctx.fillStyle = "rgb(38,38,32)";
			ctx.fillRect(0, 0, ctx_width, ctx_height);

			// Redraw line-numbering bg
			ctx.font = font;
			ln_width = ctx.measureText(buffer.length).width + 20;
			ctx.fillStyle = "rgb(28,28,22)";
			ctx.fillRect(0, 0, ln_width, ctx_height);

			// Redraw current line number bg
			ctx.fillStyle = "rgb(48,48,48)";
			ctx.fillRect(0,4+cur_row*ln_height-cur_scroll*ln_height, ln_width, ln_height);

			// Redraw mouse over bg
			ctx.fillStyle = "rgb(35,41,41)";
			ctx.fillRect(0,4+mo_idx*ln_height-ln_height, ctx_width, ln_height);
			ctx.fillStyle = "rgb(27,33,33)";
			ctx.fillRect(0,4+mo_idx*ln_height-ln_height, ln_width, ln_height);

			// Redraw current char
			ctx.fillStyle = "rgb(64,64,60)";
			ctx.fillRect(ln_width+10+cur_col*chr_width,4+cur_row*ln_height-cur_scroll*ln_height, chr_width, ln_height);

			// Redraw text
			ctx.fillStyle = "rgb(220,220,220)";
			c=0;
			for(var i=cur_scroll;i<buffer.length;i++) {
				for(var x=0;x<buffer[i].length;x++) {
					var fg_color = syntax_highlight('html',buffer,i,x);
					if(fg_color) ctx.fillStyle = fg_color;
					ctx.fillText(buffer[i][x], ln_width+10+x*chr_width, ln_height+c*ln_height);
				}
				c++;
			}

			// Draw line numbers
			ctx.fillStyle = "rgb(128,128,128)";
			c=0;
			for(var i=cur_scroll;i<buffer.length;i++) {
				ctx.fillText(i+1, 10, ln_height+c*ln_height);

				c++;

			}

		}

		function window_resize() {

			ctx_width = dest.clientWidth;
			ctx_height = dest.clientHeight;

			canvas.width = ctx_width;
			canvas.height = ctx_height;

			ctx.clearRect( 0, 0, ctx.canvas.width, ctx.canvas.height);

			window_redraw();

			check_scroll();

		}

		function insert_char(c) {

			// Inject a single char
			new_char = c;
			t_str_len = buffer[cur_row].length;
			t_before = ''+buffer[cur_row].substr(0,cur_col);
			t_after = ''+buffer[cur_row].substr(cur_col,t_str_len);
			buffer[cur_row] = ''+t_before+new_char+t_after;

			cur_col += 1;

			delete t_str_len,t_before,t_after;
		}
		function keypress_handler(e) {

			var keyCode = "keyCode" in event ? event.keyCode : event.which;

			// Backspace (and prevent going back on backspace)
			if(e.keyCode==8) {
				// Prevent default browser behaviour when pressing backspace
				e.preventDefault();

				if(cur_col==0) {
					// Append this row to the row above, if there is one
					if(cur_row>0) {
						t_tmp = ''+buffer[cur_row];
						t_pre_len = buffer[cur_row-1].length;
						buffer.splice(cur_row,1);
						cur_row-=1;
						buffer[cur_row] += t_tmp;
						cur_col = t_pre_len;
						delete t_tmp,t_pre_len;
					}
				} else {
					// Remove a single char
					t_str_len = buffer[cur_row].length;
					t_before = ''+buffer[cur_row].substr(0,cur_col-1);
					t_after = ''+buffer[cur_row].substr(cur_col,t_str_len);
					buffer[cur_row] = ''+t_before+t_after;
					cur_col -= 1;
				}

			// Delete
			} else if(e.keyCode==46 && e.shiftKey == false && e.charCode != 46) {
				e.preventDefault();

				if(cur_col==buffer[cur_row].length) {
					// Append the row below to this row, if there is one
					if(cur_row<buffer.length-1) {
						t_tmp = ''+buffer[cur_row+1];
						buffer.splice(cur_row+1,1);
						buffer[cur_row] += t_tmp;
						delete t_tmp;
					}
				} else {
					// Remove a single char
					t_str_len = buffer[cur_row].length;
					t_before = ''+buffer[cur_row].substr(0,cur_col);
					t_after = ''+buffer[cur_row].substr(cur_col+1,t_str_len);
					buffer[cur_row] = ''+t_before+t_after;
				}

			// Return (Special handling)
			} else if(e.keyCode == 13) {
				e.preventDefault();

				t_str_len = buffer[cur_row].length;
				t_before = ''+buffer[cur_row].substr(0,cur_col);
				t_after = ''+buffer[cur_row].substr(cur_col,t_str_len);

				buffer.splice(cur_row+1,0,t_after);
				buffer[cur_row] = t_before;
				cur_row += 1;
				cur_col = 0;

				delete t_after,t_str_len;

			// Home-key (Special handling)
			} else if(e.keyCode == 36 && e.shiftKey == false) {
				e.preventDefault();

				cur_col = 0;

			// End-key (Special handling)
			} else if(e.keyCode == 35 && e.shiftKey == false) {
				e.preventDefault();

				cur_col = buffer[cur_row].length;

			// Up-key (Special handling)
			} else if(e.keyCode == 38 && e.shiftKey == false) {
				e.preventDefault();

				if(cur_row>0) cur_row -= 1;
				if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;

			// Down-key (Special handling)
			} else if(e.keyCode == 40 && e.shiftKey == false) {
				e.preventDefault();

				if(cur_row<buffer.length-1) cur_row += 1;
				if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;

			// PgUp-key (Special handling)
			} else if(e.keyCode == 33 && e.shiftKey == false) {
				e.preventDefault();

				cur_row -= Math.floor(ctx_height/ln_height);
				cur_scroll -= Math.floor(ctx_height/ln_height);
				if(cur_row<0) cur_row = 0;
				if(cur_scroll<0) cur_scroll = 0;

				if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;

			// PgDown-key (Special handling)
			} else if(e.keyCode == 34 && e.shiftKey == false) {

				e.preventDefault();

				cur_row += Math.floor(ctx_height/ln_height);
				cur_scroll += Math.floor(ctx_height/ln_height);
				if(cur_row>buffer.length-1) cur_row = buffer.length-1;
				if(cur_scroll+Math.floor(ctx_height/ln_height)>buffer.length-1) cur_scroll = Math.floor(buffer.length-ctx_height/ln_height);
				if(cur_scroll<0) cur_scroll = 0;

				if(cur_col>buffer[cur_row].length) cur_col = buffer[cur_row].length;


			// Left-key (Special handling)
			} else if(keyCode == 37 && e.shiftKey == false) {
				e.preventDefault();

				if(cur_col>0) {
					cur_col -= 1;
				} else {
					if(cur_row>0) {
						cur_row -= 1;
					 	cur_col = buffer[cur_row].length;
					 }
				}

			// Right-key (Special handling)
			} else if(e.keyCode == 39 && e.shiftKey == false) {
				e.preventDefault();

				if(cur_col<buffer[cur_row].length) {
					cur_col += 1;
				} else {
					if(cur_row<buffer.length-1) {
						cur_col = 0;
					 	cur_row += 1;
					 }
				}

			// Return (Special handling)
			} else if(e.keyCode == 9 && e.shiftKey == false) {
				e.preventDefault();

				insert_char(" ");
				insert_char(" ");
				insert_char(" ");
				insert_char(" ");

			// Single quote, 191 on swedish keyboard and 222 on english?
			} else if((keyCode == 191 || keyCode == 222) && e.shiftKey == false) {
				e.preventDefault();
				insert_char("'");

			} else if(e.charCode) {
				e.preventDefault();

				insert_char(String.fromCharCode(e.charCode));
			} else {
				console.log(keyCode,e.charCode,e.which);
			}

			check_scroll();

			window_redraw();

		}

		var exports = {
			load_data: function(data,title) { load_data(data,title); },
			place: function(dest_elm) { return create(dest_elm); }
		};

		if (dest_elm) {
			create(dest_elm);
			return exports;
		} else {
			return weblime;
		}

	};
}())));